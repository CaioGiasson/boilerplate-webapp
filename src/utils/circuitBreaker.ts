import LogManager from '@/managers/Log.manager'
import { IntegrationError } from '@/errors'

export enum CircuitState {
	Closed = 'closed',
	Open = 'open',
	HalfOpen = 'half-open',
}

export class CircuitOpenError extends IntegrationError {
	readonly dependency: string

	constructor(dependency: string) {
		super(`${dependency} is temporarily unavailable`)
		this.name = 'CircuitOpenError'
		this.dependency = dependency
		Object.defineProperty(this, 'code', { value: 'CIRCUIT_OPEN', enumerable: true })
	}
}

export type CircuitBreakerOptions = {
	failureThreshold?: number
	resetTimeoutMs?: number
	now?: () => number
}

const DEFAULT_FAILURE_THRESHOLD = 5
const DEFAULT_RESET_TIMEOUT_MS = 30_000

export class CircuitBreaker {
	private state: CircuitState = CircuitState.Closed
	private consecutiveFailures = 0
	private openedAt = 0
	private readonly failureThreshold: number
	private readonly resetTimeoutMs: number
	private readonly now: () => number

	constructor(
		readonly name: string,
		options: CircuitBreakerOptions = {}
	) {
		this.failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD
		this.resetTimeoutMs = options.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS
		this.now = options.now ?? Date.now
	}

	getState(): CircuitState {
		return this.state
	}

	resetForTests(): void {
		this.state = CircuitState.Closed
		this.consecutiveFailures = 0
		this.openedAt = 0
	}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		const now = this.now()

		if (this.state === CircuitState.Open) {
			if (now - this.openedAt < this.resetTimeoutMs) {
				throw new CircuitOpenError(this.name)
			}
			this.state = CircuitState.HalfOpen
		}

		try {
			const result = await fn()
			this.onSuccess()
			return result
		} catch (error: unknown) {
			this.onFailure(now)
			throw error
		}
	}

	private onSuccess(): void {
		this.consecutiveFailures = 0
		this.state = CircuitState.Closed
	}

	private onFailure(now: number): void {
		this.consecutiveFailures += 1
		if (this.consecutiveFailures >= this.failureThreshold) {
			this.state = CircuitState.Open
			this.openedAt = now
			LogManager.info(`Circuit breaker opened: ${this.name}`, {
				consecutiveFailures: this.consecutiveFailures,
				resetTimeoutMs: this.resetTimeoutMs,
			})
		}
	}
}
