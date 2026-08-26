/**
 * Backfill User.hideFromGlobalMosaic from settings.appearInGlobalMosaic (DATA-04).
 *
 * Deploy order:
 * 1) npm run prisma:push
 * 2) npm run backfill:hide-from-global-mosaic
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const OPT_OUT_KEY = 'appearInGlobalMosaic'

async function main() {
	const prisma = new PrismaClient()

	try {
		const users = await prisma.user.findMany({
			where: {
				OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
			},
			select: { id: true, settings: true, hideFromGlobalMosaic: true },
		})

		let updated = 0
		for (const user of users) {
			const settings = Array.isArray(user.settings) ? user.settings : []
			const entry = settings.find(
				(item) => item && typeof item === 'object' && 'key' in item && item.key === OPT_OUT_KEY
			)
			const optedOut = entry?.value === false
			if (optedOut !== user.hideFromGlobalMosaic) {
				await prisma.user.update({
					where: { id: user.id },
					data: { hideFromGlobalMosaic: optedOut },
				})
				updated += 1
			}
		}

		console.log(`Backfill hideFromGlobalMosaic: ${updated} user(s) updated of ${users.length} active`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error('Failed to backfill hideFromGlobalMosaic')
	console.error(error)
	process.exitCode = 1
})
