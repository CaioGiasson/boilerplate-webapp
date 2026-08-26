import { maskEmail } from '@/utils/maskEmail'

describe('maskEmail', () => {
	it('preserva o primeiro caractere local e mascara o domínio', () => {
		expect(maskEmail('alice@example.com')).toBe('a***@e***.com')
	})

	it('mascara local de um caractere', () => {
		expect(maskEmail('a@x.com')).toBe('a***@x***.com')
	})

	it('mascara valor sem @', () => {
		expect(maskEmail('not-an-email')).toBe('n***')
	})
})
