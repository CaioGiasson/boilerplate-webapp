/**
 * Define o papel (USER ou ADMIN) de uma conta ativa. É a única forma de criar um admin.
 *
 * Uso:
 *   npm run change-user-role -- <email> <USER|ADMIN> [--confirm]
 *
 * Em produção exige --confirm. Promover a ADMIN concede acesso a /admin e ao impersonamento de usuários:
 * confirme a identidade de quem pediu antes de rodar.
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { isProductionEnv, maskEmail } from './lib/operator.mjs'
import { recordOperatorAudit } from './lib/audit.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const ROLES = ['USER', 'ADMIN']
const USAGE = 'Usage: npm run change-user-role -- <email> <USER|ADMIN> [--confirm]'

const confirm = process.argv.includes('--confirm')
const [rawEmail, rawRole] = process.argv.slice(2).filter((arg) => arg !== '--confirm')
const email = rawEmail?.trim().toLowerCase() ?? ''
const role = rawRole?.trim().toUpperCase() ?? ''

async function main() {
	if (!email.includes('@') || !ROLES.includes(role)) {
		console.error(USAGE)
		process.exit(1)
	}
	if (isProductionEnv() && !confirm) {
		console.error('Production environment: pass --confirm to write.')
		process.exit(1)
	}

	const prisma = new PrismaClient()
	try {
		const user = await prisma.user.findFirst({
			where: { email, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
			select: { id: true, nickname: true, email: true, role: true },
		})
		if (!user) {
			console.error(`User not found: ${maskEmail(email)}`)
			process.exit(1)
		}

		const previous = user.role ?? 'USER'
		await prisma.user.update({ where: { id: user.id }, data: { role } })
		await recordOperatorAudit(prisma, {
			action: 'operator.role_changed',
			targetUserId: user.id,
			metadata: { from: previous, to: role },
		})
		console.log(`Role for ${user.nickname} (${maskEmail(user.email)}): ${previous} -> ${role}`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
