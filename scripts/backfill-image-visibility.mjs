/**
 * Backfill Image.visibility to PUBLIC for active documents missing the field.
 *
 * Deploy order:
 * 1) npm run prisma:push   (schema with Visibility enum + default PUBLIC)
 * 2) npm run backfill-image-visibility
 *
 * After db push, MongoDB may not fill the new field on existing documents.
 * This script sets visibility PUBLIC where the field is unset/null and the image is not deleted.
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

async function main() {
	const prisma = new PrismaClient()

	try {
		const result = await prisma.$runCommandRaw({
			update: 'Image',
			updates: [
				{
					q: {
						$and: [
							{ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
							{ $or: [{ visibility: { $exists: false } }, { visibility: null }] },
						],
					},
					u: { $set: { visibility: 'PUBLIC' } },
					multi: true,
				},
			],
		})

		const matched = typeof result.n === 'number' ? result.n : 0
		const modified = typeof result.nModified === 'number' ? result.nModified : matched
		console.log(`Backfill image visibility: ${modified} document(s) set to PUBLIC`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error('Failed to backfill image visibility')
	console.error(error)
	process.exitCode = 1
})
