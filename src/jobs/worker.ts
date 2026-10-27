import { randomUUID } from 'node:crypto'
import { runWithoutTransaction } from '@/managers/Db.manager'
import LogManager from '@/managers/Log.manager'
import JobRepository from '@/repositories/Job.repository'
import { JOB_DEFAULT_POLL_INTERVAL_MS } from '@/constants/jobs'
import { buildJobHandlers } from '@/jobs/registry'
import { processNextJob, type JobHandlers } from '@/jobs/processNextJob'

export type JobWorker = {
	/** Para de pegar jobs novos e espera o job em andamento terminar. */
	stop(): Promise<void>
}

/** Intervalo entre consultas quando a fila está vazia (`JOBS_POLL_INTERVAL_MS`, mínimo 500 ms). */
export function resolvePollIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
	const parsed = Number(env.JOBS_POLL_INTERVAL_MS)
	return Number.isInteger(parsed) && parsed >= 500 ? parsed : JOB_DEFAULT_POLL_INTERVAL_MS
}

/** O worker liga por padrão; `JOBS_WORKER=off` desliga (ex.: réplica que só atende HTTP). Nunca roda nos testes. */
export function isJobWorkerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	if (env.NODE_ENV === 'test') return false
	return env.JOBS_WORKER?.trim().toLowerCase() !== 'off'
}

/**
 * Laço do worker dentro do próprio processo web: pega um job por vez e, quando a fila esvazia, dorme
 * `intervalMs`. Usa `runWithoutTransaction` (mesmo acesso do `UseCaseMasterPort`) e **não** é um use case para não
 * gerar uma linha de log por consulta. O consumo é atômico, então mais de um worker (ou réplica) não duplica job.
 */
export function startJobWorker(
	options: { handlers?: JobHandlers; intervalMs?: number; workerId?: string } = {}
): JobWorker {
	const handlers = options.handlers ?? buildJobHandlers()
	const intervalMs = options.intervalMs ?? resolvePollIntervalMs()
	const workerId = options.workerId ?? `${process.pid}-${randomUUID().slice(0, 8)}`

	let stopped = false
	let timer: NodeJS.Timeout | undefined
	let current: Promise<void> = Promise.resolve()

	const tick = async (): Promise<void> => {
		let more = true
		while (more && !stopped) {
			try {
				const result = await runWithoutTransaction((prisma) =>
					processNextJob({ repository: new JobRepository(prisma), handlers, workerId })
				)
				more = result.processed
			} catch (error: unknown) {
				// Banco fora do ar etc.: espera o próximo intervalo em vez de girar em falso.
				LogManager.error('Job worker tick failed', error)
				more = false
			}
		}
	}

	const schedule = () => {
		if (stopped) return
		timer = setTimeout(() => {
			current = tick().finally(schedule)
		}, intervalMs)
		timer.unref()
	}

	LogManager.info('Job worker started', { workerId, intervalMs })
	schedule()

	return {
		async stop() {
			stopped = true
			if (timer) clearTimeout(timer)
			await current
		},
	}
}
