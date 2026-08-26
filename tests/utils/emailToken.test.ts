import { EMAIL_CODE_LENGTH, createEmailToken, hashEmailToken, normalizeEmailToken } from '@/utils/emailToken'

describe('emailToken', () => {
	it('gera código de 8 caracteres A–Z / 0–9', () => {
		const { token, hash } = createEmailToken()
		expect(token).toMatch(/^[A-Z0-9]{8}$/)
		expect(token).toHaveLength(EMAIL_CODE_LENGTH)
		expect(hash).toBe(hashEmailToken(token.toLowerCase()))
	})

	it('normalizeEmailToken remove ruído e limita a 8', () => {
		expect(normalizeEmailToken(' ab-c1 23z9xy ')).toBe('ABC123Z9')
		expect(normalizeEmailToken('ABCDEFGHIJKLM')).toBe('ABCDEFGH')
	})
})
