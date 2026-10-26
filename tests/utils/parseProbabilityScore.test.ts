import { parseProbabilityScore } from '@/utils/parseProbabilityScore'

describe('parseProbabilityScore', () => {
	it.each([
		['72', 72],
		['  Nota: 40 de 100', 40],
		['150', 100],
		['0', 0],
		['sem número', 0],
		['', 0],
	])('converte %p em %p', (input, expected) => {
		expect(parseProbabilityScore(input)).toBe(expected)
	})
})
