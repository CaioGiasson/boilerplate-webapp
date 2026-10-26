/**
 * Gera o thumbnail (WebP, 200 px) dos arquivos publicados que ainda não têm, e preenche
 * `File.thumbnailKey/thumbnailUrl` e, para avatares atuais, `User.photoThumbnailUrl`.
 *
 * Uso:
 *   npm run files:backfill-thumbnails -- --dry-run
 *   npm run files:backfill-thumbnails -- --confirm
 *
 * Idempotente: só toca arquivos sem `thumbnailKey`. Baixa o original, gera o thumbnail, envia ao Spaces e então
 * atualiza o Mongo; se o envio falhar o arquivo fica como estava e entra na próxima execução.
 * O thumbnail passa a contar na cota (`sizeBytes` do File).
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { parseCronArgs, requireDryRunOrConfirm } from './cron/lib/args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const THUMBNAIL_PIVOT_PX = 200
const THUMBNAIL_WEBP_QUALITY = 75
const MAX_INPUT_PIXELS = 40_000_000
const IMAGE_CATEGORIES = ['avatars', 'images']

const flags = parseCronArgs()
requireDryRunOrConfirm(flags, 'npm run files:backfill-thumbnails -- --dry-run')

function requiredEnv(name) {
	const value = process.env[name]?.trim()
	if (!value) {
		console.error(`Missing ${name} in .env`)
		process.exit(1)
	}
	return value
}

/** Mesma regra de `thumbnailKeyFor` em src/services/Storage/File.manager.ts. */
function thumbnailKeyFor(key) {
	return key.replace(/\.[a-z0-9]+$/i, '.thumb.webp')
}

async function readBody(body) {
	const chunks = []
	for await (const chunk of body) {
		chunks.push(chunk)
	}
	return Buffer.concat(chunks)
}

async function main() {
	const bucket = requiredEnv('SPACES_BUCKET')
	const publicBase = (
		process.env.SPACES_PUBLIC_BASE_URL?.trim() || `https://${bucket}.${requiredEnv('SPACES_ENDPOINT')}`
	).replace(/\/$/, '')
	const client = new S3Client({
		endpoint: `https://${requiredEnv('SPACES_ENDPOINT')}`,
		region: 'us-east-1',
		credentials: {
			accessKeyId: requiredEnv('SPACES_ACCESS_KEY_ID'),
			secretAccessKey: requiredEnv('SPACES_SECRET_ACCESS_KEY'),
		},
		forcePathStyle: false,
	})
	const prisma = new PrismaClient()
	const summary = { found: 0, done: 0, failed: 0, dryRun: flags.dryRun }

	try {
		const files = await prisma.file.findMany({
			where: {
				status: 'published',
				category: { in: IMAGE_CATEGORIES },
				OR: [{ thumbnailKey: null }, { thumbnailKey: { isSet: false } }],
			},
			select: { id: true, key: true, url: true, category: true, sizeBytes: true },
			orderBy: { createdAt: 'asc' },
		})
		summary.found = files.length
		console.log(`[files:backfill-thumbnails] published files without thumbnail: ${files.length}`)

		for (const file of files) {
			const thumbnailKey = thumbnailKeyFor(file.key)
			if (flags.dryRun) {
				console.log(`[dry-run] would create ${thumbnailKey} for file=${file.id}`)
				continue
			}

			try {
				const original = await client.send(new GetObjectCommand({ Bucket: bucket, Key: file.key }))
				const thumbnail = await sharp(await readBody(original.Body), { limitInputPixels: MAX_INPUT_PIXELS })
					.rotate()
					.resize(THUMBNAIL_PIVOT_PX, THUMBNAIL_PIVOT_PX, { fit: 'inside', withoutEnlargement: true })
					.webp({ quality: THUMBNAIL_WEBP_QUALITY })
					.toBuffer()

				await client.send(
					new PutObjectCommand({
						Bucket: bucket,
						Key: thumbnailKey,
						Body: thumbnail,
						ContentType: 'image/webp',
					})
				)

				const thumbnailUrl = `${publicBase}/${thumbnailKey}`
				await prisma.file.update({
					where: { id: file.id },
					data: { thumbnailKey, thumbnailUrl, sizeBytes: file.sizeBytes + thumbnail.byteLength },
				})
				if (file.category === 'avatars') {
					await prisma.user.updateMany({
						where: { photoUrl: file.url },
						data: { photoThumbnailUrl: thumbnailUrl },
					})
				}

				summary.done += 1
				console.log(`Created thumbnail ${thumbnailKey} for file=${file.id}`)
			} catch (error) {
				summary.failed += 1
				console.error(`Failed thumbnail for file=${file.id}`, error)
			}
		}

		console.log('[files:backfill-thumbnails] summary', JSON.stringify(summary))
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
