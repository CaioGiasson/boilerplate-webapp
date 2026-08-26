/**
 * Reseta verificação de e-mail de uma conta (dev/ops local).
 * Usage: npm run unconfirm-account -- user@example.com
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { refuseIfProduction } from './lib/operator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

refuseIfProduction()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const prisma = new PrismaClient()

async function main() {
	const email = process.argv[2]?.trim().toLowerCase()
	if (!email || !EMAIL_PATTERN.test(email)) {
		console.error('Usage: npm run unconfirm-account -- user@example.com')
		process.exit(1)
	}

	const user = await prisma.user.findFirst({
		where: {
			email,
			OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
		},
		select: {
			id: true,
			email: true,
			nickname: true,
			emailVerifiedAt: true,
		},
	})

	if (!user) {
		console.error(`No active user found for ${email}`)
		process.exit(1)
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			emailVerifiedAt: null,
			pendingEmail: null,
			emailTokenHash: null,
			emailTokenPurpose: null,
			emailTokenExpiresAt: null,
		},
	})

	console.log(
		`Unconfirmed ${user.email} (nickname=${user.nickname}). Was verified: ${Boolean(user.emailVerifiedAt)}.`
	)
}

main()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
