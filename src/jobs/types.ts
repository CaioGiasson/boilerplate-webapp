import type { EmailSendInput } from '@/services/Email/email.types'

/**
 * Catálogo de jobs: tipo → payload. Job novo = uma linha aqui + um handler em `src/jobs/handlers/` registrado em
 * `src/jobs/registry.ts`. O tipo vira dado persistido: não renomeie um tipo que ainda tem job pendente.
 */
export type JobPayloads = {
	/** E-mail transacional enviado fora do request (retry com backoff se o provedor falhar). */
	'email.send': EmailSendInput
}

export type JobType = keyof JobPayloads

export type JobHandlerContext = {
	jobId: string
	/** Tentativa em andamento (1 na primeira). */
	attempt: number
}

export type JobHandler<T extends JobType = JobType> = (
	payload: JobPayloads[T],
	context: JobHandlerContext
) => Promise<void>
