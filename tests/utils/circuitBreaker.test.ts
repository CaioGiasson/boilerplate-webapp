import { CircuitBreaker, CircuitOpenError, CircuitState } from '@/utils/circuitBreaker'

describe('CircuitBreaker', () => {
	it('opens after consecutive failures and fails fast', async () => {
		const now = jest.fn(() => 0)
		const breaker = new CircuitBreaker('test-dep', {
			failureThreshold: 2,
			resetTimeoutMs: 10_000,
			now,
		})

		await expect(breaker.execute(async () => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
		expect(breaker.getState()).toBe(CircuitState.Closed)

		await expect(breaker.execute(async () => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
		expect(breaker.getState()).toBe(CircuitState.Open)

		await expect(breaker.execute(async () => 'ok')).rejects.toBeInstanceOf(CircuitOpenError)
	})

	it('closes again after success in half-open', async () => {
		let t = 0
		const now = jest.fn(() => t)
		const breaker = new CircuitBreaker('test-dep', {
			failureThreshold: 1,
			resetTimeoutMs: 1000,
			now,
		})

		await expect(breaker.execute(async () => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
		expect(breaker.getState()).toBe(CircuitState.Open)

		t = 1000
		await expect(breaker.execute(async () => 'recovered')).resolves.toBe('recovered')
		expect(breaker.getState()).toBe(CircuitState.Closed)
	})
})
