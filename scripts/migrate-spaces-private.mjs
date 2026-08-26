import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { S3Client, ListObjectsV2Command, PutObjectAclCommand } from '@aws-sdk/client-s3'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const dryRun = process.argv.includes('--dry-run')
const confirm = process.argv.includes('--confirm')

function requiredEnv(name) {
	const value = process.env[name]?.trim()
	if (!value) {
		console.error(`Missing ${name} in .env`)
		process.exit(1)
	}
	return value
}

async function main() {
	if (!dryRun && !confirm) {
		console.error('Refusing to run without --confirm (or use --dry-run).')
		console.error('Example: npm run spaces:make-private -- --confirm')
		process.exit(1)
	}

	const endpoint = requiredEnv('SPACES_ENDPOINT')
	const bucket = requiredEnv('SPACES_BUCKET')
	const accessKeyId = requiredEnv('SPACES_ACCESS_KEY_ID')
	const secretAccessKey = requiredEnv('SPACES_SECRET_ACCESS_KEY')

	const client = new S3Client({
		endpoint: `https://${endpoint}`,
		region: 'us-east-1',
		credentials: { accessKeyId, secretAccessKey },
		forcePathStyle: false,
	})

	const keys = []
	let continuationToken

	do {
		const response = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				ContinuationToken: continuationToken,
			})
		)

		for (const item of response.Contents ?? []) {
			if (item.Key) {
				keys.push(item.Key)
			}
		}

		continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
	} while (continuationToken)

	console.log(`Found ${keys.length} object(s) in bucket "${bucket}".`)
	if (keys.length === 0) {
		return
	}

	let updated = 0
	for (const key of keys) {
		if (dryRun) {
			console.log(`[dry-run] would set private: ${key}`)
			updated++
			continue
		}

		await client.send(
			new PutObjectAclCommand({
				Bucket: bucket,
				Key: key,
				ACL: 'private',
			})
		)
		updated++
		if (updated % 25 === 0 || updated === keys.length) {
			console.log(`Updated ${updated}/${keys.length}`)
		}
	}

	console.log(dryRun ? 'Dry run complete.' : `Done. ${updated} object(s) set to private.`)
}

main().catch((error) => {
	console.error('Migration failed.')
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
