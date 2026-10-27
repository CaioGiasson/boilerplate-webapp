/**
 * Desativa o 2FA de uma conta (celular perdido e sem códigos de recuperação) e derruba as sessões dela.
 *
 * Uso:
 *   npm run two-factor:reset -- <email> --confirm
 *
 * Apaga o segredo cifrado e os códigos de recuperação; a conta volta a entrar só com a senha e pode ativar o 2FA de novo.
 * Confirme a identidade de quem pediu **antes** de rodar: este script remove uma proteção da conta.
 * Exige --confirm (em qualquer ambiente) e registra `operator.two_factor_reset` na trilha de auditoria.
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { maskEmail } from './lib/operator.mjs'
import { recordOperatorAudit } from './lib/audit.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const USAGE = 'Usage: npm run two-factor:reset -- <email> --confirm'

const confirm = process.argv.includes('--confirm')
const email =
	process.argv
		.slice(2)
		.filter((arg) => arg !== '--confirm')[0]
		?.trim()
		.toLowerCase() ?? ''

async function main() {
	if (!email.includes('@')) {
		console.error(USAGE)
		process.exit(1)
	}
	if (!confirm) {
		console.error(`Refusing to remove two-factor without --confirm. ${USAGE}`)
		process.exit(1)
	}

	const prisma = new PrismaClient()
	try {
		const user = await prisma.user.findFirst({
			where: { email, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
			select: { id: true, nickname: true, email: true, twoFactorEnabledAt: true },
		})
		if (!user) {
			console.error(`User not found: ${maskEmail(email)}`)
			process.exit(1)
		}
		if (!user.twoFactorEnabledAt) {
			console.log(`Two-factor is not enabled for ${user.nickname} (${maskEmail(user.email)}). Nothing to do.`)
			return
		}

		await prisma.user.update({
			where: { id: user.id },
			data: {
				twoFactorEnabledAt: null,
				twoFactorSecretEnc: null,
				twoFactorPendingSecretEnc: null,
				twoFactorLastStep: null,
				sessionsRevokedAt: new Date(),
			},
		})
		await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } })
		await recordOperatorAudit(prisma, { action: 'operator.two_factor_reset', targetUserId: user.id })
		console.log(`Two-factor removed for ${user.nickname} (${maskEmail(user.email)}). Sessions revoked.`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
