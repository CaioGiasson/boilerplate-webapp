/**
 * PRIV-I03 retention purge:
 * 1. Soft-deleted images older than 30 days → Spaces DeleteObject + File orphan
 * 2. Spaces DeleteObject for File status=orphan older than 7 days
 * 3. Delete SessionEvent rows with exp in the past
 * 4. Delete ActiveSession rows with exp in the past
 * 5. Users with deletedAt older than 30 days → hard purge (Spaces + soft-delete images + anonymize)
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
const SOFT_DELETED_IMAGE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const ACCOUNT_QUARANTINE_MS = 30 * 24 * 60 * 60 * 1000

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
	const softDeletedCutoff = new Date(Date.now() - SOFT_DELETED_IMAGE_MAX_AGE_MS)
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
		softDeletedImagesFound: 0,
		softDeletedFilesReleased: 0,
		softDeletedFilesFailed: 0,
		orphansFound: 0,
		orphansDeleted: 0,
		orphansFailed: 0,
		sessionEventsDeleted: 0,
		activeSessionsDeleted: 0,
		quarantinedAccountsFound: 0,
		quarantinedAccountsPurged: 0,
		quarantinedAccountsFailed: 0,
		dryRun: flags.dryRun,
	}

	try {
		const softDeletedImages = await prisma.image.findMany({
			where: {
				deletedAt: { not: null, lt: softDeletedCutoff },
				fileId: { not: null },
			},
			select: { id: true, fileId: true, deletedAt: true },
			orderBy: { deletedAt: 'asc' },
		})
		summary.softDeletedImagesFound = softDeletedImages.length
		console.log(
			`[retention-purge] soft-deleted images: ${softDeletedImages.length} with deletedAt < ${softDeletedCutoff.toISOString()} (30d)`
		)

		for (const image of softDeletedImages) {
			if (!image.fileId) continue
			const file = await prisma.file.findUnique({
				where: { id: image.fileId },
				select: { id: true, key: true, status: true },
			})
			if (!file) continue
			if (file.status === 'orphan') continue

			if (flags.dryRun) {
				console.log(`[dry-run] would release soft-deleted image=${image.id} file=${file.id} key=${file.key}`)
				continue
			}

			try {
				await client.send(
					new DeleteObjectCommand({
						Bucket: bucket,
						Key: file.key,
					})
				)
				await prisma.file.update({
					where: { id: file.id },
					data: { status: 'orphan', updatedAt: now },
				})
				summary.softDeletedFilesReleased += 1
				console.log(`Released soft-deleted image=${image.id} file=${file.id} key=${file.key}`)
			} catch (error) {
				summary.softDeletedFilesFailed += 1
				console.error(`Failed release soft-deleted image=${image.id} file=${file.id}`, error)
			}
		}

		const orphans = await prisma.file.findMany({
			where: {
				status: 'orphan',
				updatedAt: { lt: orphanCutoff },
			},
			select: { id: true, key: true, updatedAt: true },
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
				await client.send(
					new DeleteObjectCommand({
						Bucket: bucket,
						Key: file.key,
					})
				)
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
					select: { id: true, key: true, status: true },
				})
				for (const file of files) {
					try {
						await client.send(
							new DeleteObjectCommand({
								Bucket: bucket,
								Key: file.key,
							})
						)
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

				await prisma.image.updateMany({
					where: {
						ownerId: user.id,
						OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
					},
					data: { deletedAt: now },
				})

				const sentinel = createHash('sha256').update(randomBytes(32)).digest('hex')
				await prisma.user.update({
					where: { id: user.id },
					data: {
						email: `deleted_${user.id}@invalid.local`,
						nickname: `deleted_${user.id}`,
						name: null,
						photoUrl: null,
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

				summary.quarantinedAccountsPurged += 1
				console.log(`Hard-purged quarantined user=${user.id}`)
			} catch (error) {
				summary.quarantinedAccountsFailed += 1
				console.error(`Failed hard-purge user=${user.id}`, error)
			}
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
