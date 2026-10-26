import { ForbiddenError, UnauthorizedError } from '@/errors'
import { assertNotImpersonation, requireAuth, tryAuthFromToken } from '@/middleware/auth.middleware'
import { signImpersonationToken, signSessionToken } from '@/utils/session'

const existsForJti = jest.fn()
const upsertFromClaims = jest.fn()
const sessionEventExists = jest.fn()
const findById = jest.fn()

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({ existsForJti, upsertFromClaims }))
})
jest.mock('@/repositories/SessionEvent.repository', () => {
	return jest.fn().mockImplementation(() => ({ existsForJti: sessionEventExists }))
})
jest.mock('@/repositories/User.repository', () => {
	return jest.fn().mockImplementation(() => ({ findById }))
})

const STRONG_SECRET = 'test-jwt-secret-must-be-32-chars!'
const PRISMA = {} as never

function requestWithToken(token: string) {
	return { cookies: { get: (name: string) => (name === 'app-session' ? { value: token } : undefined) } } as never
}

describe('auth.middleware e sessão de impersonamento', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		process.env.JWT_SECRET = STRONG_SECRET
		process.env.NODE_ENV = 'test'
		existsForJti.mockReset().mockResolvedValue(false)
		upsertFromClaims.mockReset()
		sessionEventExists.mockReset().mockResolvedValue(false)
		findById.mockReset().mockResolvedValue({ id: 'target-1', sessionsRevokedAt: null })
	})

	afterAll(() => {
		process.env = { ...originalEnv }
	})

	it('sessão comum ganha ActiveSession (self-heal)', async () => {
		const signed = await signSessionToken({ userId: 'target-1', device: 'web' })

		await requireAuth(requestWithToken(signed.token), PRISMA)

		expect(upsertFromClaims).toHaveBeenCalledWith(expect.objectContaining({ userId: 'target-1', jti: signed.jti }))
	})

	it('sessão de impersonamento nunca vira ActiveSession em requireAuth', async () => {
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })

		const session = await requireAuth(requestWithToken(signed.token), PRISMA)

		expect(session.sessionType).toBe('IMPERSONATION')
		expect(upsertFromClaims).not.toHaveBeenCalled()
	})

	it('sessão de impersonamento nunca vira ActiveSession em tryAuthFromToken', async () => {
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })

		const session = await tryAuthFromToken(signed.token, PRISMA)

		expect(session?.impersonatedBy).toBe('admin-1')
		expect(upsertFromClaims).not.toHaveBeenCalled()
	})

	it('continua recusando impersonamento quando o alvo trocou a senha depois da emissão', async () => {
		const signed = await signImpersonationToken({ userId: 'target-1', adminId: 'admin-1' })
		findById.mockResolvedValue({ id: 'target-1', sessionsRevokedAt: new Date(Date.now() + 60_000) })

		await expect(requireAuth(requestWithToken(signed.token), PRISMA)).rejects.toBeInstanceOf(UnauthorizedError)
		await expect(tryAuthFromToken(signed.token, PRISMA)).resolves.toBeNull()
	})

	describe('assertNotImpersonation', () => {
		it('lança 403 em sessão de impersonamento', () => {
			expect(() => assertNotImpersonation({ sessionType: 'IMPERSONATION' })).toThrow(ForbiddenError)
		})

		it('deixa passar sessão comum', () => {
			expect(() => assertNotImpersonation({})).not.toThrow()
		})
	})
})
