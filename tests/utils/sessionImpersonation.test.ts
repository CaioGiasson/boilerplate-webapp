import {
	DEVICE_COOKIE_NAME,
	HOST_SESSION_COOKIE_NAME,
	HTTP_SESSION_COOKIE_NAME,
	IMPERSONATION_DEVICE,
	IMPERSONATION_TTL_SECONDS,
	clearSessionCookies,
	isImpersonationSession,
	signImpersonationToken,
	signSessionToken,
	verifySessionToken,
} from '@/utils/session'

const STRONG_SECRET = 'test-jwt-secret-must-be-32-chars!'

describe('sessão de impersonamento', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		process.env.JWT_SECRET = STRONG_SECRET
		delete process.env.JWT_ISSUER
		delete process.env.JWT_AUDIENCE
	})

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('emite token de 10 minutos com tipo, admin e device fixos', async () => {
		const before = Math.floor(Date.now() / 1000)
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })

		const session = await verifySessionToken(signed.token)
		expect(session.userId).toBe('target-1')
		expect(session.impersonatedBy).toBe('admin-1')
		expect(session.sessionType).toBe('IMPERSONATION')
		expect(session.device).toBe(IMPERSONATION_DEVICE)
		expect(isImpersonationSession(session)).toBe(true)
		expect(IMPERSONATION_TTL_SECONDS).toBe(600)
		expect(session.exp - session.iat).toBe(IMPERSONATION_TTL_SECONDS)
		expect(session.exp).toBeGreaterThanOrEqual(before + IMPERSONATION_TTL_SECONDS)
	})

	it('sessão comum não é de impersonamento e não carrega claims extras', async () => {
		const signed = await signSessionToken({ userId: 'user-1', device: 'web' })

		const session = await verifySessionToken(signed.token)
		expect(isImpersonationSession(session)).toBe(false)
		expect(session.sessionType).toBeUndefined()
		expect(session.impersonatedBy).toBeUndefined()
	})

	it('aceita TTL customizado sem alterar o padrão das demais sessões', async () => {
		const short = await signSessionToken({ userId: 'user-1', device: 'web' }, { ttlSeconds: 30 })
		const session = await verifySessionToken(short.token)

		expect(session.exp - session.iat).toBe(30)
	})
})

describe('clearSessionCookies', () => {
	function collectExpired() {
		const set = jest.fn()
		return { set, expiredNames: () => new Set(set.mock.calls.map((call) => call[0] as string)) }
	}

	it('por padrão expira sessão e device', () => {
		const { set, expiredNames } = collectExpired()

		clearSessionCookies({ set })

		expect(expiredNames()).toEqual(
			new Set([HTTP_SESSION_COOKIE_NAME, HOST_SESSION_COOKIE_NAME, DEVICE_COOKIE_NAME])
		)
	})

	it('com keepDevice preserva o device do navegador', () => {
		const { set, expiredNames } = collectExpired()

		clearSessionCookies({ set }, undefined, { keepDevice: true })

		expect(expiredNames().has(DEVICE_COOKIE_NAME)).toBe(false)
		expect(expiredNames().has(HTTP_SESSION_COOKIE_NAME)).toBe(true)
	})
})
