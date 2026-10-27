export const JOB_STATUS = {
	PENDING: 'pending',
	RUNNING: 'running',
	SUCCEEDED: 'succeeded',
	FAILED: 'failed',
} as const

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS]

export const JOB_DEFAULT_MAX_ATTEMPTS = 5
/** Quanto tempo um worker "segura" o job antes de outro poder retomá-lo (o handler precisa terminar antes). */
export const JOB_DEFAULT_LOCK_SECONDS = 300
export const JOB_DEFAULT_POLL_INTERVAL_MS = 5_000

/** Backoff exponencial: 30 s, 1 min, 2 min, 4 min… até 1 h (com variação para não sincronizar tentativas). */
export const JOB_BACKOFF_BASE_SECONDS = 30
export const JOB_BACKOFF_MAX_SECONDS = 60 * 60

export const JOB_ERROR_MAX_LENGTH = 500

/** Retenção (job vencido sai no `retention-purge`): concluídos pouco tempo, falhos mais para diagnóstico. */
export const JOB_SUCCEEDED_RETENTION_DAYS_DEFAULT = 7
export const JOB_FAILED_RETENTION_DAYS_DEFAULT = 30
