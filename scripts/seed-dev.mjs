/**
 * Cria contas de desenvolvimento (um admin e um usuário comum), prontas para login.
 *
 * Uso:
 *   npm run seed:dev
 *   SEED_PASSWORD='Sua#Senha1' npm run seed:dev
 *
 * Idempotente: conta que já existe (mesmo e-mail) é ignorada. Sem SEED_PASSWORD, gera uma senha
 * aleatória e a imprime uma única vez. Recusa rodar em produção.
 */
import { config as loadEnv } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { hash } from 'argon2'
import { PrismaClient } from '@prisma/client'
import { refuseIfProduction } from './lib/operator.mjs'

const require = createRequire(import.meta.url)
const { passwordPolicyIssue } = require('./lib/passwordPolicy.cjs')

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const LEGAL_VERSION = '2026-08-21'
const ACCOUNTS = [
	{ nickname: 'admin', email: 'admin@example.test', role: 'ADMIN' },
	{ nickname: 'demo', email: 'demo@example.test', role: 'USER' },
]

function generatePassword() {
	return `${randomBytes(12).toString('base64url')}aA1!`
}

async function main() {
	refuseIfProduction()

	const generated = !process.env.SEED_PASSWORD
	const password = process.env.SEED_PASSWORD ?? generatePassword()
	if (passwordPolicyIssue(password)) {
		console.error('SEED_PASSWORD fora da política (8–128 caracteres e ao menos 3 classes).')
		process.exit(1)
	}

	const passwordHash = await hash(password)
	const now = new Date()
	const prisma = new PrismaClient()
	let created = 0
	try {
		for (const account of ACCOUNTS) {
			const existing = await prisma.user.findFirst({
				where: { OR: [{ email: account.email }, { nickname: account.nickname }] },
				select: { id: true },
			})
			if (existing) {
				console.log(`Já existe: ${account.email} (ignorado)`)
				continue
			}
			await prisma.user.create({
				data: {
					nickname: account.nickname,
					email: account.email,
					role: account.role,
					passwordHash,
					acceptedTermsAt: now,
					acceptedPrivacyAt: now,
					termsVersion: LEGAL_VERSION,
					privacyVersion: LEGAL_VERSION,
					dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
					ageVerifiedAt: now,
					emailVerifiedAt: now,
				},
			})
			created += 1
			console.log(`Criada: ${account.email} (${account.role})`)
		}
	} finally {
		await prisma.$disconnect()
	}

	if (created > 0 && generated) {
		console.log(`Senha gerada (mostrada uma vez): ${password}`)
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
