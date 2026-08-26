import { CircuitBreaker } from '@/utils/circuitBreaker'

/** Process-local breakers for external dependencies (REL-02). */
export const brevoCircuitBreaker = new CircuitBreaker('brevo', {
	failureThreshold: 5,
	resetTimeoutMs: 30_000,
})

export const spacesCircuitBreaker = new CircuitBreaker('spaces', {
	failureThreshold: 5,
	resetTimeoutMs: 30_000,
})

export function resetExternalBreakersForTests(): void {
	brevoCircuitBreaker.resetForTests()
	spacesCircuitBreaker.resetForTests()
}
