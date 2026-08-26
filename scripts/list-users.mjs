import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { maskEmail, refuseIfProduction } from './lib/operator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

refuseIfProduction()

const LIMIT = 10

/**
 * @param {Date | null | undefined} value
 */
function formatDate(value) {
	if (!value) {
		return '-'
	}
	return value.toISOString()
}

async function main() {
	const prisma = new PrismaClient()

	try {
		// Soft-delete (espelha UserRepository.activeWhere): null ≡ campo ausente no Mongo/Prisma.
		const users = await prisma.user.findMany({
			where: {
				OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
			},
			orderBy: { createdAt: 'desc' },
			take: LIMIT,
			select: {
				id: true,
				nickname: true,
				email: true,
				name: true,
				photoUrl: true,
				createdAt: true,
			},
		})

		console.log(`Últimos ${LIMIT} usuários cadastrados\n`)

		if (users.length === 0) {
			console.log('(nenhum usuário encontrado)')
			return
		}

		for (const [index, user] of users.entries()) {
			console.log(`${index + 1}. ${user.nickname}`)
			console.log(`   id:        ${user.id}`)
			console.log(`   email:     ${maskEmail(user.email)}`)
			console.log(`   name:      ${user.name ?? '-'}`)
			console.log(`   photoUrl:  ${user.photoUrl ?? '-'}`)
			console.log(`   createdAt: ${formatDate(user.createdAt)}`)
			console.log('')
		}

		console.log(`Total listado: ${users.length}`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error('Falha ao listar usuários')
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
