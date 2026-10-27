/**
 * Define a senha de uma conta ativa e revoga as sessões já emitidas.
 *
 * Uso:
 *   npm run change-user-password -- <email> --confirm            (a senha vem de NEW_PASSWORD)
 *   npm run change-user-password -- <email> <new_password> --confirm
 *
 * Prefira NEW_PASSWORD: argumento de linha de comando fica no histórico do shell.
 * Pode rodar em produção, mas exige --confirm. A senha segue a política do app
 * (8–128 caracteres e ao menos 3 classes), é gravada com argon2 e nunca é impressa.
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { hash } from 'argon2'
import { PrismaClient } from '@prisma/client'
import { maskEmail } from './lib/operator.mjs'
import { recordOperatorAudit } from './lib/audit.mjs'

const require = createRequire(import.meta.url)
const { passwordPolicyIssue } = require('./lib/passwordPolicy.cjs')

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const USAGE = 'Usage: NEW_PASSWORD=<new_password> npm run change-user-password -- <email> --confirm'
const POLICY_MESSAGES = {
	minLength: 'Password must be at least 8 characters.',
	maxLength: 'Password must be at most 128 characters.',
	complexity: 'Password must include at least 3 of: lowercase, uppercase, numbers, symbols.',
}

const args = process.argv.slice(2).filter((arg) => arg !== '--confirm')
const confirm = process.argv.includes('--confirm')
const email = args[0]?.trim().toLowerCase() ?? ''
const password = args[1] ?? process.env.NEW_PASSWORD ?? ''

async function main() {
	if (!email || !password || args.length > 2) {
		console.error(USAGE)
		process.exit(1)
	}
	if (!email.includes('@')) {
		console.error('Invalid email.')
		process.exit(1)
	}
	if (!confirm) {
		console.error(`Refusing to change a password without --confirm. ${USAGE}`)
		process.exit(1)
	}

	const issue = passwordPolicyIssue(password)
	if (issue) {
		console.error(POLICY_MESSAGES[issue])
		process.exit(1)
	}

	const prisma = new PrismaClient()
	try {
		const user = await prisma.user.findFirst({
			where: {
				email,
				OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
			},
			select: { id: true, nickname: true, email: true },
		})
		if (!user) {
			console.error(`User not found: ${maskEmail(email)}`)
			process.exit(1)
		}

		await prisma.user.update({
			where: { id: user.id },
			data: { passwordHash: await hash(password), sessionsRevokedAt: new Date() },
		})
		await recordOperatorAudit(prisma, { action: 'operator.password_changed', targetUserId: user.id })
		console.log(`Password updated for ${user.nickname} (${maskEmail(user.email)}). Sessions revoked.`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
