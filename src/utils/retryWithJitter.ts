export type RetryWithJitterOptions = {
	maxAttempts?: number
	baseDelayMs?: number
	maxDelayMs?: number
	totalBudgetMs?: number
	shouldRetry?: (error: unknown, attempt: number) => boolean
	onRetry?: (error: unknown, attempt: number, delayMs: number) => void
	sleep?: (ms: number) => Promise<void>
	random?: () => number
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 200
const DEFAULT_MAX_DELAY_MS = 5_000
const DEFAULT_TOTAL_BUDGET_MS = 15_000

function defaultSleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

/** True for HTTP 429 and 5xx — safe to retry idempotent reads/writes when the caller allows it. */
export function isRetryableHttpStatus(status: number): boolean {
	return status === 429 || (status >= 500 && status <= 599)
}

export function jitteredDelayMs(
	attempt: number,
	baseDelayMs: number,
	maxDelayMs: number,
	random: () => number
): number {
	const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
	const jitter = exponential * (0.5 + random() * 0.5)
	return Math.round(jitter)
}

/**
 * Retries an async operation with exponential backoff and jitter.
 * Does not retry by default — pass `shouldRetry` (e.g. for 429/5xx).
 */
export async function retryWithJitter<T>(fn: () => Promise<T>, options: RetryWithJitterOptions = {}): Promise<T> {
	const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
	const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
	const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
	const totalBudgetMs = options.totalBudgetMs ?? DEFAULT_TOTAL_BUDGET_MS
	const shouldRetry = options.shouldRetry ?? (() => false)
	const sleep = options.sleep ?? defaultSleep
	const random = options.random ?? Math.random
	const startedAt = Date.now()

	let lastError: unknown

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await fn()
		} catch (error: unknown) {
			lastError = error
			const isLastAttempt = attempt >= maxAttempts
			const budgetExceeded = Date.now() - startedAt >= totalBudgetMs
			if (isLastAttempt || budgetExceeded || !shouldRetry(error, attempt)) {
				throw error
			}

			const delayMs = jitteredDelayMs(attempt, baseDelayMs, maxDelayMs, random)
			options.onRetry?.(error, attempt, delayMs)
			await sleep(delayMs)
		}
	}

	throw lastError
}
