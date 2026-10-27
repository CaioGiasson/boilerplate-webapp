import { TooManyRequestsError } from '@/errors'
import {
	TWO_FACTOR_IP_RATE_LIMIT_MAX,
	TWO_FACTOR_USER_RATE_LIMIT_MAX,
	assertTwoFactorIpRateLimit,
	assertTwoFactorUserRateLimit,
	resetAuthRateLimitStoreForTests,
} from '@/middleware/rateLimit.middleware'

const request = (ip: string) => ({ headers: { get: (name: string) => (name === 'x-real-ip' ? ip : null) } })

describe('limites do segundo passo do 2FA', () => {
	beforeEach(() => resetAuthRateLimitStoreForTests())

	it('por conta: 5 tentativas passam e a 6ª bloqueia, não importa o IP', () => {
		for (let i = 0; i < TWO_FACTOR_USER_RATE_LIMIT_MAX; i += 1) assertTwoFactorUserRateLimit('user-1')

		expect(() => assertTwoFactorUserRateLimit('user-1')).toThrow(TooManyRequestsError)
		expect(() => assertTwoFactorUserRateLimit('user-2')).not.toThrow()
	})

	it('por IP: teto folgado (NAT/escritório) e separado por IP', () => {
		for (let i = 0; i < TWO_FACTOR_IP_RATE_LIMIT_MAX; i += 1) assertTwoFactorIpRateLimit(request('203.0.113.1'))

		expect(() => assertTwoFactorIpRateLimit(request('203.0.113.1'))).toThrow(TooManyRequestsError)
		expect(() => assertTwoFactorIpRateLimit(request('203.0.113.2'))).not.toThrow()
	})

	it('o limite por conta não consome o do login nem o inverso', () => {
		for (let i = 0; i < TWO_FACTOR_USER_RATE_LIMIT_MAX; i += 1) assertTwoFactorUserRateLimit('user-1')

		expect(() => assertTwoFactorIpRateLimit(request('203.0.113.9'))).not.toThrow()
	})
})
