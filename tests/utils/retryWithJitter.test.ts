import { isRetryableHttpStatus, jitteredDelayMs, retryWithJitter } from '@/utils/retryWithJitter'

describe('retryWithJitter', () => {
	it('retries on shouldRetry until success', async () => {
		let attempts = 0
		const sleep = jest.fn(async () => undefined)
		const random = () => 0

		const result = await retryWithJitter(
			async () => {
				attempts += 1
				if (attempts < 3) {
					throw new Error('transient')
				}
				return 'ok'
			},
			{
				maxAttempts: 5,
				baseDelayMs: 10,
				maxDelayMs: 20,
				shouldRetry: () => true,
				sleep,
				random,
			}
		)

		expect(result).toBe('ok')
		expect(attempts).toBe(3)
		expect(sleep).toHaveBeenCalledTimes(2)
	})

	it('does not retry non-retryable errors', async () => {
		let attempts = 0
		await expect(
			retryWithJitter(
				async () => {
					attempts += 1
					throw new Error('fatal')
				},
				{ shouldRetry: () => false }
			)
		).rejects.toThrow('fatal')
		expect(attempts).toBe(1)
	})
})

describe('isRetryableHttpStatus', () => {
	it('allows 429 and 5xx only', () => {
		expect(isRetryableHttpStatus(429)).toBe(true)
		expect(isRetryableHttpStatus(503)).toBe(true)
		expect(isRetryableHttpStatus(400)).toBe(false)
		expect(isRetryableHttpStatus(404)).toBe(false)
	})
})

describe('jitteredDelayMs', () => {
	it('stays within bounds', () => {
		const delay = jitteredDelayMs(2, 100, 500, () => 0)
		expect(delay).toBeGreaterThanOrEqual(100)
		expect(delay).toBeLessThanOrEqual(500)
	})
})
