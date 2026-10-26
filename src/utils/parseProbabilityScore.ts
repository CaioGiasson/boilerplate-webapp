const MIN_SCORE = 0
const MAX_SCORE = 100

/** Extrai o primeiro inteiro do texto e o limita a 0–100; sem número, devolve 0. */
export function parseProbabilityScore(text: string): number {
	const match = text.trim().match(/\d+/)
	if (!match) {
		return MIN_SCORE
	}

	const value = parseInt(match[0], 10)
	if (!Number.isFinite(value)) {
		return MIN_SCORE
	}

	return Math.min(MAX_SCORE, Math.max(MIN_SCORE, value))
}
