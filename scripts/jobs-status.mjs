/**
 * Situação da fila de jobs e reenfileiramento de job falho.
 *
 * Uso:
 *   npm run jobs:status                              contagem por estado + últimos falhos (sem payload)
 *   npm run jobs:status -- --retry <id> --confirm    devolve um job falho para a fila (zera as tentativas)
 *
 * O payload pode ter dado pessoal (ex.: e-mail do destinatário), por isso a listagem nunca o mostra.
 * Reenfileirar exige --confirm: o job roda de novo e pode repetir um efeito (e-mail, push).
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i
const STATUSES = ['pending', 'running', 'succeeded', 'failed']
const FAILED_LIST_LIMIT = 20

const confirm = process.argv.includes('--confirm')
const retryIndex = process.argv.indexOf('--retry')
const retryId = retryIndex >= 0 ? process.argv[retryIndex + 1]?.trim() : undefined

async function main() {
	const prisma = new PrismaClient()
	try {
		if (retryIndex >= 0) {
			if (!retryId || !OBJECT_ID_PATTERN.test(retryId)) {
				console.error('Usage: npm run jobs:status -- --retry <jobId> --confirm')
				process.exit(1)
			}
			if (!confirm) {
				console.error(
					'Refusing to requeue a job without --confirm (it will run again and may repeat its effect).'
				)
				process.exit(1)
			}
			const { count } = await prisma.job.updateMany({
				where: { id: retryId, status: 'failed' },
				data: {
					status: 'pending',
					attempts: 0,
					runAt: new Date(),
					lockedUntil: null,
					lockedBy: null,
					finishedAt: null,
				},
			})
			console.log(count === 1 ? `Job ${retryId} requeued.` : `No failed job with id ${retryId}.`)
			return
		}

		for (const status of STATUSES) {
			console.log(`${status.padEnd(10)} ${await prisma.job.count({ where: { status } })}`)
		}
		const failed = await prisma.job.findMany({
			where: { status: 'failed' },
			orderBy: { finishedAt: 'desc' },
			take: FAILED_LIST_LIMIT,
			select: { id: true, type: true, attempts: true, lastError: true, finishedAt: true },
		})
		if (failed.length > 0) {
			console.log(`\nÚltimos falhos (até ${FAILED_LIST_LIMIT}):`)
			for (const job of failed) {
				console.log(
					`  ${job.id}  ${job.type}  tentativas=${job.attempts}  ${job.finishedAt?.toISOString() ?? '-'}  ${job.lastError ?? ''}`
				)
			}
		}
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
