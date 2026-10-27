import LogManager from '@/managers/Log.manager'
import type JobRepository from '@/repositories/Job.repository'
import type { JobRecord } from '@/repositories/Job.repository'
import { JOB_BACKOFF_BASE_SECONDS, JOB_BACKOFF_MAX_SECONDS, JOB_DEFAULT_LOCK_SECONDS } from '@/constants/jobs'
import type { JobHandler, JobType } from '@/jobs/types'

export type JobHandlers = Partial<{ [T in JobType]: JobHandler<T> }>

export type ProcessNextJobResult =
	| { processed: false }
	| { processed: true; jobId: string; type: string; outcome: 'succeeded' | 'retry' | 'failed' }

/**
 * Espera antes da tentativa seguinte: `30 s × 2^(tentativa-1)`, limitado a 1 h, com ±20 % de variação
 * (`random` em [0, 1)) para tentativas de jobs diferentes não baterem juntas no mesmo provedor.
 */
export function backoffSeconds(attempt: number, random: () => number = Math.random): number {
	const exponential = Math.min(JOB_BACKOFF_BASE_SECONDS * 2 ** Math.max(0, attempt - 1), JOB_BACKOFF_MAX_SECONDS)
	return Math.round(exponential * (0.8 + random() * 0.4))
}

function describeError(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

/**
 * Pega **um** job elegível e o executa. Semântica **at-least-once**: se o worker morrer depois do efeito e antes
 * de marcar `succeeded`, o job é retomado quando a trava vence e roda de novo — handler deve tolerar repetição.
 *
 * - Handler sem registro → `failed` na hora (sem retry: não há o que tentar).
 * - Erro do handler → `pending` com backoff, até `maxAttempts`; depois `failed` (payload preservado p/ diagnóstico).
 * - Sucesso → `succeeded` e payload zerado.
 */
export async function processNextJob(input: {
	repository: JobRepository
	handlers: JobHandlers
	workerId: string
	now?: () => Date
	lockSeconds?: number
	random?: () => number
}): Promise<ProcessNextJobResult> {
	const now = input.now ?? (() => new Date())
	const job: JobRecord | null = await input.repository.claimNext({
		now: now(),
		lockSeconds: input.lockSeconds ?? JOB_DEFAULT_LOCK_SECONDS,
		workerId: input.workerId,
	})
	if (!job) return { processed: false }

	const handler = input.handlers[job.type as JobType] as JobHandler | undefined
	if (!handler) {
		LogManager.error('Job has no registered handler', { jobId: job.id, type: job.type })
		await input.repository.markFailed(job.id, { error: `No handler registered for "${job.type}"`, now: now() })
		return { processed: true, jobId: job.id, type: job.type, outcome: 'failed' }
	}

	try {
		await handler(job.payload as never, { jobId: job.id, attempt: job.attempts })
		await input.repository.markSucceeded(job.id, now())
		return { processed: true, jobId: job.id, type: job.type, outcome: 'succeeded' }
	} catch (error: unknown) {
		const message = describeError(error)
		if (job.attempts >= job.maxAttempts) {
			LogManager.error('Job failed permanently', { jobId: job.id, type: job.type, attempts: job.attempts })
			await input.repository.markFailed(job.id, { error: message, now: now() })
			return { processed: true, jobId: job.id, type: job.type, outcome: 'failed' }
		}

		const delay = backoffSeconds(job.attempts, input.random)
		LogManager.warn('Job failed, retry scheduled', {
			jobId: job.id,
			type: job.type,
			attempt: job.attempts,
			retryInSeconds: delay,
		})
		await input.repository.scheduleRetry(job.id, {
			runAt: new Date(now().getTime() + delay * 1000),
			error: message,
		})
		return { processed: true, jobId: job.id, type: job.type, outcome: 'retry' }
	}
}
