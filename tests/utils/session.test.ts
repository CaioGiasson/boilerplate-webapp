import { SignJWT } from 'jose'
import { getJwtSecret } from '@/config/env'
import {
	DEVICE_COOKIE_NAME,
	HOST_SESSION_COOKIE_NAME,
	HTTP_SESSION_COOKIE_NAME,
	applySessionCookie,
	getSessionCookieName,
	getSessionCookieOptions,
	readSessionCookieValue,
	signSessionToken,
	verifySessionToken,
} from '@/utils/session'
import { UnauthorizedError } from '@/errors'

const STRONG_SECRET = 'test-jwt-secret-must-be-32-chars!'

describe('session JWT', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		process.env.JWT_SECRET = STRONG_SECRET
		delete process.env.JWT_ISSUER
		delete process.env.JWT_AUDIENCE
	})

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('assina e verifica token com iss/aud', async () => {
		const signed = await signSessionToken({ userId: 'user-1', device: 'web' })
		expect(signed.token).toEqual(expect.any(String))
		expect(signed.jti).toMatch(/^[0-9a-f-]{36}$/i)
		expect(typeof signed.exp).toBe('number')

		const session = await verifySessionToken(signed.token)
		expect(session.userId).toBe('user-1')
		expect(session.device).toBe('web')
		expect(session.jti).toBe(signed.jti)
		expect(session.token).toBe(signed.token)
		expect(session.exp).toBe(signed.exp)
	})

	it('rejeita token sem iss/aud', async () => {
		const token = await new SignJWT({ userId: 'user-1', device: 'web' })
			.setProtectedHeader({ alg: 'HS256' })
			.setExpirationTime('1h')
			.sign(getJwtSecret())

		await expect(verifySessionToken(token)).rejects.toBeInstanceOf(UnauthorizedError)
	})
})

describe('session cookie options', () => {
	const originalNodeEnv = process.env.NODE_ENV

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv
	})

	it('usa vitraux-session sem Secure em HTTP local', () => {
		process.env.NODE_ENV = 'development'
		const context = { url: 'http://localhost:3000/api/v1/auth/login' }
		const options = getSessionCookieOptions(3600, context)

		expect(getSessionCookieName(context)).toBe(HTTP_SESSION_COOKIE_NAME)
		expect(options).toEqual({
			httpOnly: true,
			secure: false,
			sameSite: 'lax',
			path: '/',
			maxAge: 3600,
		})
		expect(options).not.toHaveProperty('domain')
	})

	it('usa __Host-vitraux-session com Secure em production', () => {
		process.env.NODE_ENV = 'production'
		const options = getSessionCookieOptions(3600)

		expect(getSessionCookieName()).toBe(HOST_SESSION_COOKIE_NAME)
		expect(options.secure).toBe(true)
		expect(options.httpOnly).toBe(true)
		expect(options.path).toBe('/')
		expect(options.sameSite).toBe('lax')
		expect(options).not.toHaveProperty('domain')
	})

	it('liga Secure via x-forwarded-proto mesmo fora de production', () => {
		process.env.NODE_ENV = 'development'
		const context = {
			headers: {
				get(name: string) {
					return name.toLowerCase() === 'x-forwarded-proto' ? 'https, http' : null
				},
			},
			url: 'http://127.0.0.1/api/v1/auth/login',
		}
		const options = getSessionCookieOptions(60, context)

		expect(getSessionCookieName(context)).toBe(HOST_SESSION_COOKIE_NAME)
		expect(options.secure).toBe(true)
		expect(options.path).toBe('/')
		expect(options).not.toHaveProperty('domain')
	})

	it('lê o cookie __Host- antes do nome HTTP', () => {
		const cookies = {
			get(name: string) {
				if (name === HOST_SESSION_COOKIE_NAME) {
					return { value: 'host-token' }
				}
				if (name === HTTP_SESSION_COOKIE_NAME) {
					return { value: 'http-token' }
				}
				return undefined
			},
		}

		expect(readSessionCookieValue(cookies)).toBe('host-token')
	})

	it('grava o cookie de sessão por último e expira nomes antigos sem limpar device', () => {
		process.env.NODE_ENV = 'production'
		const set = jest.fn()
		applySessionCookie({ set }, 'jwt-token', 120)

		expect(set).toHaveBeenCalledWith(
			HTTP_SESSION_COOKIE_NAME,
			'',
			expect.objectContaining({ maxAge: 0, path: '/', secure: false })
		)
		expect(set).toHaveBeenCalledWith(
			HTTP_SESSION_COOKIE_NAME,
			'',
			expect.objectContaining({ maxAge: 0, path: '/', secure: true })
		)
		expect(set).not.toHaveBeenCalledWith(DEVICE_COOKIE_NAME, '', expect.anything())
		const lastCall = set.mock.calls.at(-1)
		expect(lastCall?.[0]).toBe(HOST_SESSION_COOKIE_NAME)
		expect(lastCall?.[1]).toBe('jwt-token')
		expect(lastCall?.[2]).toEqual(expect.objectContaining({ httpOnly: true, secure: true, path: '/', maxAge: 120 }))
	})
})
