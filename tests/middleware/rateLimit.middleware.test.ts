import { NextRequest } from 'next/server'
import { TooManyRequestsError } from '@/errors'
import loginRoute from '@/controllers/Auth/routes/login.route'
import LoginUser from '@/useCases/loginUser.usecase'
import {
	AUTH_RATE_LIMIT_MESSAGE,
	InMemoryRateLimiter,
	assertAuthRateLimit,
	assertImageListRateLimit,
	extractClientIp,
	rateLimitKeyPartFromBody,
	resetAuthRateLimitStoreForTests,
} from '@/middleware/rateLimit.middleware'

jest.mock('@/utils/session', () => {
	const actual = jest.requireActual<typeof import('@/utils/session')>('@/utils/session')
	return {
		...actual,
		applySessionCookie: jest.fn(),
		applyDeviceCookie: jest.fn(),
	}
})

function requestLike(headers: Record<string, string>): { headers: { get(name: string): string | null } } {
	const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))
	return {
		headers: {
			get(name: string) {
				return normalized[name.toLowerCase()] ?? null
			},
		},
	}
}

describe('InMemoryRateLimiter', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('permite 5 consumes e bloqueia o 6º na mesma chave', () => {
		const limiter = new InMemoryRateLimiter()
		for (let i = 0; i < 5; i += 1) {
			expect(() => limiter.consume('1.1.1.1:alice')).not.toThrow()
		}
		expect(() => limiter.consume('1.1.1.1:alice')).toThrow(TooManyRequestsError)
	})

	it('isola chaves diferentes (IP e identificador)', () => {
		const limiter = new InMemoryRateLimiter()
		for (let i = 0; i < 5; i += 1) {
			limiter.consume('1.1.1.1:alice')
		}
		expect(() => limiter.consume('1.1.1.1:alice')).toThrow(TooManyRequestsError)
		expect(() => limiter.consume('1.1.1.1:bob')).not.toThrow()
		expect(() => limiter.consume('2.2.2.2:alice')).not.toThrow()
	})

	it('aplica lockout progressivo 60s e depois 5min', () => {
		const limiter = new InMemoryRateLimiter()
		for (let i = 0; i < 5; i += 1) {
			limiter.consume('k')
		}
		try {
			limiter.consume('k')
			throw new Error('expected rate limit')
		} catch (error) {
			expect(error).toBeInstanceOf(TooManyRequestsError)
			expect((error as TooManyRequestsError).retryAfterSeconds).toBe(60)
		}

		jest.setSystemTime(new Date('2026-01-01T00:00:59.000Z'))
		expect(() => limiter.consume('k')).toThrow(TooManyRequestsError)

		jest.setSystemTime(new Date('2026-01-01T00:01:00.000Z'))
		for (let i = 0; i < 5; i += 1) {
			expect(() => limiter.consume('k')).not.toThrow()
		}
		try {
			limiter.consume('k')
			throw new Error('expected rate limit')
		} catch (error) {
			expect(error).toBeInstanceOf(TooManyRequestsError)
			expect((error as TooManyRequestsError).retryAfterSeconds).toBe(300)
			expect((error as TooManyRequestsError).message).toBe(AUTH_RATE_LIMIT_MESSAGE)
			expect((error as TooManyRequestsError).code).toBe('RATE_LIMITED')
			expect((error as TooManyRequestsError).statusCode).toBe(429)
		}
	})
})

describe('assertAuthRateLimit', () => {
	it('normaliza identifier (trim/lowercase) e usa o último hop de x-forwarded-for', () => {
		const limiter = new InMemoryRateLimiter()
		const request = requestLike({ 'x-forwarded-for': '  203.0.113.10, 10.0.0.1' })
		for (let i = 0; i < 5; i += 1) {
			assertAuthRateLimit(request, 'Admin', limiter)
		}
		expect(() => assertAuthRateLimit(request, ' admin ', limiter)).toThrow(TooManyRequestsError)
	})

	it('prefere do-connecting-ip a um X-Forwarded-For forjado', () => {
		const limiter = new InMemoryRateLimiter()
		const spoofed = requestLike({
			'x-forwarded-for': '198.51.100.9',
			'do-connecting-ip': '192.0.2.1',
		})
		for (let i = 0; i < 5; i += 1) {
			assertAuthRateLimit(spoofed, 'n', limiter)
		}
		expect(() => assertAuthRateLimit(spoofed, 'n', limiter)).toThrow(TooManyRequestsError)
		expect(() =>
			assertAuthRateLimit(requestLike({ 'x-forwarded-for': '198.51.100.9' }), 'n', limiter)
		).not.toThrow()
	})

	it('mapeia IPv4-mapped IPv6 e cai em x-real-ip', () => {
		const limiter = new InMemoryRateLimiter()
		const forwarded = requestLike({ 'x-forwarded-for': '::ffff:192.0.2.1' })
		assertAuthRateLimit(forwarded, 'n', limiter)
		const realIp = requestLike({ 'x-real-ip': '192.0.2.1' })
		for (let i = 0; i < 4; i += 1) {
			assertAuthRateLimit(realIp, 'n', limiter)
		}
		expect(() => assertAuthRateLimit(realIp, 'n', limiter)).toThrow(TooManyRequestsError)
	})
})

describe('extractClientIp / rateLimitKeyPartFromBody', () => {
	it('extrai IP e campos do body sem vazar validação', () => {
		expect(extractClientIp(requestLike({}))).toBe('unknown')
		expect(rateLimitKeyPartFromBody({ email: 'A@B.com', nickname: 'Nick' }, ['email', 'nickname'])).toBe(
			'A@B.com|Nick'
		)
		expect(rateLimitKeyPartFromBody(null, ['email'])).toBe('')
	})
})

describe('image route rate limits', () => {
	beforeEach(() => {
		resetAuthRateLimitStoreForTests()
	})

	it('limits image list per IP', () => {
		const request = requestLike({ 'x-forwarded-for': '198.51.100.2' })
		for (let i = 0; i < 120; i += 1) {
			assertImageListRateLimit(request)
		}
		expect(() => assertImageListRateLimit(request)).toThrow(TooManyRequestsError)
	})
})

describe('loginRoute rate limit envelope', () => {
	afterEach(() => {
		resetAuthRateLimitStoreForTests()
	})

	it('responde 429 genérico após 5 tentativas/min', async () => {
		const run = jest.fn().mockResolvedValue({
			user: { id: 'u1' },
			settings: [],
			token: 'token',
			ttlSeconds: 60,
			device: 'device-1',
		})
		const loginUserUseCase = { run } as unknown as LoginUser
		const body = { identifier: 'alice', password: 'secret', device: 'web' }

		for (let i = 0; i < 5; i += 1) {
			const response = await loginRoute(
				new NextRequest('http://localhost/api/v1/auth/login', {
					method: 'POST',
					headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.1' },
					body: JSON.stringify(body),
				}),
				{ loginUserUseCase }
			)
			expect(response.status).not.toBe(429)
		}

		const limited = await loginRoute(
			new NextRequest('http://localhost/api/v1/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.1' },
				body: JSON.stringify(body),
			}),
			{ loginUserUseCase }
		)
		expect(limited.status).toBe(429)
		expect(limited.headers.get('Retry-After')).toBeTruthy()
		await expect(limited.json()).resolves.toEqual({
			success: false,
			message: AUTH_RATE_LIMIT_MESSAGE,
			code: 'RATE_LIMITED',
		})
		expect(run).toHaveBeenCalledTimes(5)
	})
})
