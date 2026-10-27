/**
 * PRIV-I03 retention purge:
 * 1. Spaces DeleteObject for File status=orphan older than 7 days
 * 2. Delete SessionEvent rows with exp in the past
 * 3. Delete ActiveSession rows with exp in the past
 * 4. Users with deletedAt older than 30 days → hard purge (Spaces + anonymize + AiLog do titular)
 * 5. AiLog older than AI_LOG_RETENTION_DAYS (default 90)
 * 6. Notification older than NOTIFICATION_RETENTION_DAYS (default 180); hard purge também apaga
 *    as notificações e as assinaturas push do titular
 * 7. AuditEvent older than AUDIT_LOG_RETENTION_DAYS (default 365); hard purge zera o IP dos eventos do titular
 *
 * Uso:
 *   npm run cron -- retention-purge --dry-run
 *   npm run cron -- retention-purge --confirm
 *   npm run cron:retention -- --dry-run
 */
import { pathToFileURL } from 'node:url'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { parseCronArgs, requireDryRunOrConfirm } from '../lib/args.mjs'
import { loadRepoEnv, requiredEnv } from '../lib/env.mjs'

const ORPHAN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const ACCOUNT_QUARANTINE_MS = 30 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_AI_LOG_RETENTION_DAYS = 90

const DEFAULT_NOTIFICATION_RETENTION_DAYS = 180
const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 365

/**
 * @param {string | undefined} raw
 * @param {number} fallback
 */
function positiveIntegerOrDefault(raw, fallback) {
	const parsed = Number(raw)
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** @param {NodeJS.ProcessEnv} [env] */
export function resolveAiLogRetentionDays(env = process.env) {
	return positiveIntegerOrDefault(env.AI_LOG_RETENTION_DAYS, DEFAULT_AI_LOG_RETENTION_DAYS)
}

/** @param {NodeJS.ProcessEnv} [env] */
export function resolveAuditLogRetentionDays(env = process.env) {
	return positiveIntegerOrDefault(env.AUDIT_LOG_RETENTION_DAYS, DEFAULT_AUDIT_LOG_RETENTION_DAYS)
}

/** @param {NodeJS.ProcessEnv} [env] */
export function resolveNotificationRetentionDays(env = process.env) {
	return positiveIntegerOrDefault(env.NOTIFICATION_RETENTION_DAYS, DEFAULT_NOTIFICATION_RETENTION_DAYS)
}

/**
 * Apaga o objeto principal e o thumbnail (arquivos anteriores ao pipeline de imagem não têm).
 * @param {S3Client} client
 * @param {string} bucket
 * @param {{ key: string, thumbnailKey?: string | null }} file
 */
async function deleteFileObjects(client, bucket, file) {
	await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.key }))
	if (file.thumbnailKey) {
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.thumbnailKey }))
	}
}

/**
 * @param {{ dryRun?: boolean, confirm?: boolean }} [flags]
 */
export async function runRetentionPurge(flags = parseCronArgs()) {
	requireDryRunOrConfirm(flags, 'npm run cron -- retention-purge --dry-run')

	loadRepoEnv()

	const endpoint = requiredEnv('SPACES_ENDPOINT')
	const bucket = requiredEnv('SPACES_BUCKET')
	const accessKeyId = requiredEnv('SPACES_ACCESS_KEY_ID')
	const secretAccessKey = requiredEnv('SPACES_SECRET_ACCESS_KEY')

	const orphanCutoff = new Date(Date.now() - ORPHAN_MAX_AGE_MS)
	const accountCutoff = new Date(Date.now() - ACCOUNT_QUARANTINE_MS)
	const now = new Date()
	const prisma = new PrismaClient()
	const client = new S3Client({
		endpoint: `https://${endpoint}`,
		region: 'us-east-1',
		credentials: { accessKeyId, secretAccessKey },
		forcePathStyle: false,
	})

	const summary = {
		orphansFound: 0,
		orphansDeleted: 0,
		orphansFailed: 0,
		sessionEventsDeleted: 0,
		activeSessionsDeleted: 0,
		quarantinedAccountsFound: 0,
		quarantinedAccountsPurged: 0,
		quarantinedAccountsFailed: 0,
		aiLogsDeleted: 0,
		notificationsDeleted: 0,
		auditEventsDeleted: 0,
		dryRun: flags.dryRun,
	}

	try {
		const orphans = await prisma.file.findMany({
			where: {
				status: 'orphan',
				updatedAt: { lt: orphanCutoff },
			},
			select: { id: true, key: true, thumbnailKey: true, updatedAt: true },
			orderBy: { updatedAt: 'asc' },
		})
		summary.orphansFound = orphans.length
		console.log(`[retention-purge] orphans: ${orphans.length} with updatedAt < ${orphanCutoff.toISOString()} (7d)`)

		for (const file of orphans) {
			if (flags.dryRun) {
				console.log(`[dry-run] would DeleteObject key=${file.key} id=${file.id}`)
				continue
			}
			try {
				await deleteFileObjects(client, bucket, file)
				summary.orphansDeleted += 1
				console.log(`DeletedObject key=${file.key} id=${file.id}`)
			} catch (error) {
				summary.orphansFailed += 1
				console.error(`Failed DeleteObject key=${file.key} id=${file.id}`, error)
			}
		}

		if (flags.dryRun) {
			const expiredEvents = await prisma.sessionEvent.count({
				where: { exp: { lt: now } },
			})
			const expiredSessions = await prisma.activeSession.count({
				where: { exp: { lt: now } },
			})
			summary.sessionEventsDeleted = expiredEvents
			summary.activeSessionsDeleted = expiredSessions
			console.log(
				`[dry-run] would delete SessionEvent exp<now: ${expiredEvents}; ActiveSession exp<now: ${expiredSessions}`
			)
		} else {
			const events = await prisma.sessionEvent.deleteMany({
				where: { exp: { lt: now } },
			})
			const sessions = await prisma.activeSession.deleteMany({
				where: { exp: { lt: now } },
			})
			summary.sessionEventsDeleted = events.count
			summary.activeSessionsDeleted = sessions.count
			console.log(`[retention-purge] deleted SessionEvent=${events.count} ActiveSession=${sessions.count}`)
		}

		const quarantinedUsers = await prisma.user.findMany({
			where: { deletedAt: { not: null, lt: accountCutoff } },
			select: { id: true, deletedAt: true },
			orderBy: { deletedAt: 'asc' },
		})
		summary.quarantinedAccountsFound = quarantinedUsers.length
		console.log(
			`[retention-purge] quarantined accounts: ${quarantinedUsers.length} with deletedAt < ${accountCutoff.toISOString()} (30d)`
		)

		for (const user of quarantinedUsers) {
			if (flags.dryRun) {
				console.log(`[dry-run] would hard-purge user=${user.id} deletedAt=${user.deletedAt?.toISOString()}`)
				continue
			}

			try {
				const files = await prisma.file.findMany({
					where: { ownerId: user.id },
					select: { id: true, key: true, thumbnailKey: true, status: true },
				})
				for (const file of files) {
					try {
						await deleteFileObjects(client, bucket, file)
					} catch (error) {
						console.error(`Failed DeleteObject for purge user=${user.id} file=${file.id}`, error)
					}
					if (file.status !== 'orphan') {
						await prisma.file.update({
							where: { id: file.id },
							data: { status: 'orphan', updatedAt: now },
						})
					}
				}

				const sentinel = createHash('sha256').update(randomBytes(32)).digest('hex')
				await prisma.user.update({
					where: { id: user.id },
					data: {
						email: `deleted_${user.id}@invalid.local`,
						nickname: `deleted_${user.id}`,
						name: null,
						photoUrl: null,
						photoThumbnailUrl: null,
						passwordHash: sentinel,
						googleLinkedAt: null,
						settings: [],
						dateOfBirth: null,
						ageVerifiedAt: null,
						lastLoginDevice: null,
						sessionsRevokedAt: now,
					},
				})
				await prisma.activeSession.deleteMany({ where: { userId: user.id } })
				await prisma.aiLog.deleteMany({ where: { userId: user.id } })
				await prisma.notification.deleteMany({ where: { userId: user.id } })
				await prisma.pushSubscription.deleteMany({ where: { userId: user.id } })
				// A trilha de auditoria fica (segurança), mas sem o IP do titular.
				await prisma.auditEvent.updateMany({
					where: { OR: [{ actorId: user.id }, { targetUserId: user.id }] },
					data: { ip: null },
				})

				summary.quarantinedAccountsPurged += 1
				console.log(`Hard-purged quarantined user=${user.id}`)
			} catch (error) {
				summary.quarantinedAccountsFailed += 1
				console.error(`Failed hard-purge user=${user.id}`, error)
			}
		}

		const aiLogRetentionDays = resolveAiLogRetentionDays()
		const aiLogCutoff = new Date(Date.now() - aiLogRetentionDays * DAY_MS)
		if (flags.dryRun) {
			summary.aiLogsDeleted = await prisma.aiLog.count({ where: { createdAt: { lt: aiLogCutoff } } })
			console.log(
				`[dry-run] would delete AiLog createdAt<${aiLogCutoff.toISOString()} (${aiLogRetentionDays}d): ${summary.aiLogsDeleted}`
			)
		} else {
			const aiLogs = await prisma.aiLog.deleteMany({ where: { createdAt: { lt: aiLogCutoff } } })
			summary.aiLogsDeleted = aiLogs.count
			console.log(`[retention-purge] deleted AiLog=${aiLogs.count} (older than ${aiLogRetentionDays}d)`)
		}

		const notificationRetentionDays = resolveNotificationRetentionDays()
		const notificationCutoff = new Date(Date.now() - notificationRetentionDays * DAY_MS)
		if (flags.dryRun) {
			summary.notificationsDeleted = await prisma.notification.count({
				where: { createdAt: { lt: notificationCutoff } },
			})
			console.log(
				`[dry-run] would delete Notification createdAt<${notificationCutoff.toISOString()} (${notificationRetentionDays}d): ${summary.notificationsDeleted}`
			)
		} else {
			const notifications = await prisma.notification.deleteMany({
				where: { createdAt: { lt: notificationCutoff } },
			})
			summary.notificationsDeleted = notifications.count
			console.log(
				`[retention-purge] deleted Notification=${notifications.count} (older than ${notificationRetentionDays}d)`
			)
		}

		const auditRetentionDays = resolveAuditLogRetentionDays()
		const auditCutoff = new Date(Date.now() - auditRetentionDays * DAY_MS)
		if (flags.dryRun) {
			summary.auditEventsDeleted = await prisma.auditEvent.count({ where: { createdAt: { lt: auditCutoff } } })
			console.log(
				`[dry-run] would delete AuditEvent createdAt<${auditCutoff.toISOString()} (${auditRetentionDays}d): ${summary.auditEventsDeleted}`
			)
		} else {
			const auditEvents = await prisma.auditEvent.deleteMany({ where: { createdAt: { lt: auditCutoff } } })
			summary.auditEventsDeleted = auditEvents.count
			console.log(`[retention-purge] deleted AuditEvent=${auditEvents.count} (older than ${auditRetentionDays}d)`)
		}

		console.log('[retention-purge] summary', JSON.stringify(summary))
		return summary
	} finally {
		await prisma.$disconnect()
	}
}

const isDirectRun = typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
	runRetentionPurge(parseCronArgs())
		.then(() => process.exit(0))
		.catch((error) => {
			console.error(error)
			process.exit(1)
		})
}
