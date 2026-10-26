/**
 * Grava role=USER nas contas que ainda não têm o campo (anteriores ao papel de acesso).
 * O app já trata ausência como USER; o backfill só uniformiza o dado (índice e consultas por papel).
 *
 * Uso:
 *   npm run user-role:backfill -- --dry-run
 *   npm run user-role:backfill -- --confirm
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { parseCronArgs, requireDryRunOrConfirm } from './cron/lib/args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const flags = parseCronArgs()
requireDryRunOrConfirm(flags, 'npm run user-role:backfill -- --dry-run')

const WITHOUT_ROLE = { OR: [{ role: null }, { role: { isSet: false } }] }

async function main() {
	const prisma = new PrismaClient()
	try {
		const pending = await prisma.user.count({ where: WITHOUT_ROLE })
		console.log(`[user-role:backfill] users without role: ${pending}`)

		if (flags.dryRun || pending === 0) {
			return
		}

		const result = await prisma.user.updateMany({ where: WITHOUT_ROLE, data: { role: 'USER' } })
		console.log(`[user-role:backfill] updated: ${result.count}`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
