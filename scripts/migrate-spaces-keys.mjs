/**
 * Migra keys legadas do Spaces: `{env}/{images|avatars}/{hex}.{ext}`
 * → `{ownerId}/{category}/{32 hex}.{ext}`
 *
 * Atualiza File.key/url e User.photoUrl; CopyObject + DeleteObject no Spaces.
 *
 * Uso:
 *   npm run spaces:migrate-keys -- --dry-run
 *   npm run spaces:migrate-keys -- --confirm
 */
import { config as loadEnv } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { CopyObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

const require = createRequire(import.meta.url)
const { LEGACY_KEY_PATTERN, parseLegacyKey, buildNewKey, buildCanonicalUrl } = require('./lib/spacesKeyMigration.cjs')

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const dryRun = process.argv.includes('--dry-run')
const confirm = process.argv.includes('--confirm')

const KEY_ALLOCATION_ATTEMPTS = 8

function requiredEnv(name) {
	const value = process.env[name]?.trim()
	if (!value) {
		console.error(`Missing ${name} in .env`)
		process.exit(1)
	}
	return value
}

function publicBaseUrl(bucket, endpoint) {
	const fromEnv = process.env.SPACES_PUBLIC_BASE_URL?.trim()
	if (fromEnv) {
		return fromEnv.replace(/\/$/, '')
	}
	return `https://${bucket}.${endpoint}`.replace(/\/$/, '')
}

async function allocateUniqueKey(prisma, ownerId, category, extension) {
	for (let attempt = 0; attempt < KEY_ALLOCATION_ATTEMPTS; attempt++) {
		const key = buildNewKey(ownerId, category, extension, () => randomBytes(16).toString('hex'))
		const existing = await prisma.file.findUnique({ where: { key }, select: { id: true } })
		if (!existing) {
			return key
		}
	}
	throw new Error(`Failed to allocate unique key for owner ${ownerId}`)
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string, ownerId: string | null }} file
 */
async function resolveOwnerId(_prisma, file) {
	return file.ownerId ?? null
}

async function main() {
	if (!dryRun && !confirm) {
		console.error('Refusing to run without --confirm (or use --dry-run).')
		console.error('Example: npm run spaces:migrate-keys -- --dry-run')
		process.exit(1)
	}

	const endpoint = requiredEnv('SPACES_ENDPOINT')
	const bucket = requiredEnv('SPACES_BUCKET')
	const accessKeyId = requiredEnv('SPACES_ACCESS_KEY_ID')
	const secretAccessKey = requiredEnv('SPACES_SECRET_ACCESS_KEY')
	const baseUrl = publicBaseUrl(bucket, endpoint)

	const client = new S3Client({
		endpoint: `https://${endpoint}`,
		region: 'us-east-1',
		credentials: { accessKeyId, secretAccessKey },
		forcePathStyle: false,
	})

	const prisma = new PrismaClient()

	let migrated = 0
	let skipped = 0
	let failed = 0

	try {
		const files = await prisma.file.findMany({
			select: { id: true, key: true, url: true, ownerId: true, status: true },
		})

		const legacyFiles = files.filter((file) => LEGACY_KEY_PATTERN.test(file.key))
		console.log(`Found ${legacyFiles.length} legacy File key(s) (of ${files.length} total).`)
		console.log(`Public base URL: ${baseUrl}`)
		console.log(dryRun ? 'Mode: dry-run' : 'Mode: confirm')

		for (const file of legacyFiles) {
			const parsed = parseLegacyKey(file.key)
			if (!parsed) {
				skipped++
				console.warn(`[skip] unparseable key file=${file.id} key=${file.key}`)
				continue
			}

			const ownerId = await resolveOwnerId(prisma, file)
			if (!ownerId) {
				skipped++
				console.warn(`[skip] no ownerId file=${file.id} key=${file.key}`)
				continue
			}

			try {
				const newKey = await allocateUniqueKey(prisma, ownerId, parsed.category, parsed.extension)
				const newUrl = buildCanonicalUrl(baseUrl, newKey)
				const oldKey = file.key
				const oldUrl = file.url

				console.log(`[plan] ${oldKey} → ${newKey}`)

				if (dryRun) {
					migrated++
					continue
				}

				await client.send(
					new CopyObjectCommand({
						Bucket: bucket,
						CopySource: `${bucket}/${oldKey}`,
						Key: newKey,
						ACL: 'private',
						MetadataDirective: 'COPY',
					})
				)

				await prisma.file.update({
					where: { id: file.id },
					data: { key: newKey, url: newUrl },
				})

				const usersUpdated = await prisma.user.updateMany({
					where: { photoUrl: oldUrl },
					data: { photoUrl: newUrl },
				})

				await client.send(
					new DeleteObjectCommand({
						Bucket: bucket,
						Key: oldKey,
					})
				)

				migrated++
				console.log(`[ok] file=${file.id} users=${usersUpdated.count}`)
			} catch (error) {
				failed++
				console.error(`[fail] file=${file.id} key=${file.key}`)
				console.error(error instanceof Error ? error.message : error)
			}
		}

		console.log(
			dryRun
				? `Dry run complete. wouldMigrate=${migrated} skipped=${skipped} failed=${failed}`
				: `Done. migrated=${migrated} skipped=${skipped} failed=${failed}`
		)
	} finally {
		await prisma.$disconnect()
	}

	if (failed > 0) {
		process.exitCode = 1
	}
}

main().catch((error) => {
	console.error('Migration failed.')
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
