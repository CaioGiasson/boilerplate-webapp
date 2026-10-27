import type { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'
import { JOB_DEFAULT_MAX_ATTEMPTS, JOB_ERROR_MAX_LENGTH, JOB_STATUS, type JobStatus } from '@/constants/jobs'
import type { JobPayloads, JobType } from '@/jobs/types'

export type JobRecord = {
	id: string
	type: string
	payload: unknown
	status: string
	attempts: number
	maxAttempts: number
	runAt: Date
	lockedUntil: Date | null
	lockedBy: string | null
	lastError: string | null
	createdAt: Date
	finishedAt: Date | null
}

export type EnqueueOptions = {
	/** Agenda para depois; padrão: agora. */
	runAt?: Date
	maxAttempts?: number
}

/**
 * Fila sobre o Mongo. `claimNext` é atômico (`updateMany` condicional): dois workers nunca pegam o mesmo job.
 * Chame `enqueue` com o client da **transação do use case**: o job só passa a existir se a transação confirmar (outbox).
 */
export default class JobRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async enqueue<T extends JobType>(type: T, payload: JobPayloads[T], options: EnqueueOptions = {}): Promise<string> {
		try {
			const job = await this.prisma.job.create({
				data: {
					type,
					payload: payload as unknown as Prisma.InputJsonValue,
					status: JOB_STATUS.PENDING,
					maxAttempts: options.maxAttempts ?? JOB_DEFAULT_MAX_ATTEMPTS,
					runAt: options.runAt ?? new Date(),
				},
				select: { id: true },
			})
			return job.id
		} catch (error: unknown) {
			throw new RepositoryError('Failed to enqueue job', error)
		}
	}

	/**
	 * Pega o próximo job elegível: `pending` com `runAt` vencido, **ou** `running` com a trava vencida (o worker
	 * que o tinha morreu). Marca `running`, trava por `lockSeconds` e conta a tentativa. `null` se não há nada.
	 */
	async claimNext(input: { now: Date; lockSeconds: number; workerId: string }): Promise<JobRecord | null> {
		try {
			const eligible: Prisma.JobWhereInput = {
				OR: [
					{ status: JOB_STATUS.PENDING, runAt: { lte: input.now } },
					{ status: JOB_STATUS.RUNNING, lockedUntil: { lt: input.now } },
				],
			}
			const candidate = await this.prisma.job.findFirst({ where: eligible, orderBy: { runAt: 'asc' } })
			if (!candidate) return null

			const { count } = await this.prisma.job.updateMany({
				// Repete a condição: outro worker pode ter pego o candidato entre a leitura e a escrita.
				where: { id: candidate.id, ...eligible },
				data: {
					status: JOB_STATUS.RUNNING,
					lockedUntil: new Date(input.now.getTime() + input.lockSeconds * 1000),
					lockedBy: input.workerId,
					attempts: { increment: 1 },
				},
			})
			if (count !== 1) return null

			return await this.prisma.job.findFirst({ where: { id: candidate.id } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to claim job', error)
		}
	}

	/** Conclui e zera o payload (pode ter dado pessoal; o registro fica só para métrica até a retenção). */
	async markSucceeded(id: string, now: Date): Promise<void> {
		try {
			await this.prisma.job.update({
				where: { id },
				data: {
					status: JOB_STATUS.SUCCEEDED,
					payload: null,
					lockedUntil: null,
					lockedBy: null,
					lastError: null,
					finishedAt: now,
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark job as succeeded', error)
		}
	}

	/** Volta para `pending` com novo `runAt` (backoff). */
	async scheduleRetry(id: string, input: { runAt: Date; error: string }): Promise<void> {
		try {
			await this.prisma.job.update({
				where: { id },
				data: {
					status: JOB_STATUS.PENDING,
					runAt: input.runAt,
					lockedUntil: null,
					lockedBy: null,
					lastError: truncateError(input.error),
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to schedule job retry', error)
		}
	}

	/** Esgotou as tentativas (ou não tem como rodar): fica `failed` com o payload para diagnóstico. */
	async markFailed(id: string, input: { error: string; now: Date }): Promise<void> {
		try {
			await this.prisma.job.update({
				where: { id },
				data: {
					status: JOB_STATUS.FAILED,
					lockedUntil: null,
					lockedBy: null,
					lastError: truncateError(input.error),
					finishedAt: input.now,
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark job as failed', error)
		}
	}

	async countByStatus(): Promise<Record<JobStatus, number>> {
		try {
			const entries = await Promise.all(
				Object.values(JOB_STATUS).map(
					async (status) => [status, await this.prisma.job.count({ where: { status } })] as const
				)
			)
			return Object.fromEntries(entries) as Record<JobStatus, number>
		} catch (error: unknown) {
			throw new RepositoryError('Failed to count jobs', error)
		}
	}
}

export function truncateError(message: string): string {
	return message.length > JOB_ERROR_MAX_LENGTH ? `${message.slice(0, JOB_ERROR_MAX_LENGTH)}…` : message
}
