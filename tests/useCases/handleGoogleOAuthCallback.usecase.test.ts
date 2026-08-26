jest.mock('@/utils/publicUserAccess', () => ({
	toPublicUserWithSignedPhoto: jest.fn(async (user: import('@/repositories/User.repository').UserEntity) => ({
		id: user.id ?? 'user-1',
		name: user.name ?? null,
		nickname: user.nickname ?? 'alice',
		email: user.email ?? 'alice@example.com',
		photoUrl: user.photoUrl ? `${user.photoUrl}?signed=1` : null,
		settings: user.settings ?? [],
		emailVerifiedAt: user.emailVerifiedAt ?? null,
		pendingEmail: user.pendingEmail ?? null,
		emailChallenge: 'none',
		hasPassword: Boolean(user.passwordHash),
		googleLinked: Boolean(user.googleLinkedAt),
	})),
}))

jest.mock('@/utils/session', () => {
	const actual = jest.requireActual<typeof import('@/utils/session')>('@/utils/session')
	return {
		...actual,
		signSessionToken: jest.fn(async () => ({
			token: 'session-token',
			jti: 'jti-google',
			exp: Math.floor(Date.now() / 1000) + 3600,
		})),
	}
})

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({
		create: jest.fn().mockResolvedValue({ id: 'session-1' }),
	}))
})

jest.mock('@/services/Email/Email.service', () => {
	const impl = { send: jest.fn(async () => undefined) }
	const EmailService = jest.fn().mockImplementation(() => impl)
	return {
		__esModule: true,
		default: EmailService,
		getEmailService: () => new EmailService(),
		setEmailServiceForTests: jest.fn(),
	}
})

jest.mock('@/repositories/User.repository', () => {
	const actual = jest.requireActual(
		'@/repositories/User.repository'
	) as typeof import('@/repositories/User.repository')
	return {
		__esModule: true,
		...actual,
		default: jest.fn(),
	}
})

jest.mock('@/utils/googleOAuthCookies', () => {
	const actual = jest.requireActual<typeof import('@/utils/googleOAuthCookies')>('@/utils/googleOAuthCookies')
	return {
		...actual,
		verifyGoogleOAuthStateToken: jest.fn(async () => ({
			state: 'state-ok',
			returnUrl: '/mosaic',
		})),
		signGoogleOAuthPendingToken: jest.fn(async () => 'pending-token'),
	}
})

import HandleGoogleOAuthCallback from '@/useCases/handleGoogleOAuthCallback.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { UnauthorizedError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import EmailService from '@/services/Email/Email.service'
import type { GoogleOAuthPort } from '@/services/GoogleOAuth/googleOAuth.port'
import { verifyGoogleOAuthStateToken, signGoogleOAuthPendingToken } from '@/utils/googleOAuthCookies'
import { buildUser } from '../factories'

const KNOWN_DEVICE = '11111111-1111-4111-8111-111111111111'

function mockGoogle(overrides: Partial<Awaited<ReturnType<GoogleOAuthPort['fetchUserInfo']>>> = {}) {
	const google: GoogleOAuthPort = {
		buildAuthorizeUrl: jest.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth?x=1'),
		exchangeCode: jest.fn(async () => ({ accessToken: 'access' })),
		fetchUserInfo: jest.fn(async () => ({
			sub: 'google-sub',
			email: 'alice@example.com',
			emailVerified: true,
			name: 'Alice',
			picture: null,
			...overrides,
		})),
	}
	return google
}

describe('HandleGoogleOAuthCallback', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(verifyGoogleOAuthStateToken).mockResolvedValue({
			state: 'state-ok',
			returnUrl: '/mosaic',
		})
	})

	it('rejeita state mismatch', async () => {
		const useCase = new HandleGoogleOAuthCallback(mockGoogle())
		await expect(
			useCase.run({
				code: 'code',
				state: 'wrong',
				stateCookie: 'cookie',
			})
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('conta já vinculada → sessão e alerta de novo login sempre', async () => {
		const linked = buildUser({
			googleLinkedAt: new Date(),
			emailVerifiedAt: new Date(),
			passwordHash: 'hash',
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailIncludingDeleted: jest.fn().mockResolvedValue(linked),
			findByPendingEmail: jest.fn(),
			clearEmailChangeChallenge: jest.fn(),
			clearEmailVerified: jest.fn(),
			markEmailVerified: jest.fn(),
			linkGoogle: jest.fn(),
			updateLastLoginDevice: jest.fn().mockResolvedValue(undefined),
		}))

		const google = mockGoogle()
		const email = new EmailService()
		const useCase = new HandleGoogleOAuthCallback(google, email)

		const result = await useCase.run({
			code: 'code',
			state: 'state-ok',
			stateCookie: 'cookie',
			deviceCookie: KNOWN_DEVICE,
		})

		expect(result.kind).toBe('session')
		if (result.kind !== 'session') return
		expect(result.redirectPath).toBe('/mosaic')
		expect(result.device).toBe(KNOWN_DEVICE)
		expect(email.send).toHaveBeenCalledTimes(1)
	})

	it('conta com senha sem Google → pending link', async () => {
		const user = buildUser({ googleLinkedAt: null, passwordHash: 'hash' })
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailIncludingDeleted: jest.fn().mockResolvedValue(user),
			findByPendingEmail: jest.fn(),
			clearEmailChangeChallenge: jest.fn(),
			clearEmailVerified: jest.fn(),
		}))

		const useCase = new HandleGoogleOAuthCallback(mockGoogle())
		const result = await useCase.run({
			code: 'code',
			state: 'state-ok',
			stateCookie: 'cookie',
		})

		expect(result.kind).toBe('pending')
		if (result.kind !== 'pending') return
		expect(result.flow).toBe('link')
		expect(result.redirectPath).toBe('/login/google/link')
		expect(signGoogleOAuthPendingToken).toHaveBeenCalledWith(
			expect.objectContaining({
				flow: 'link',
				email: 'alice@example.com',
				userId: 'user-1',
				emailChangeCancelled: false,
				googleEmailUnverified: false,
			})
		)
	})

	it('sem usuário → pending register', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailIncludingDeleted: jest.fn().mockResolvedValue(null),
			findByPendingEmail: jest.fn().mockResolvedValue(null),
		}))

		const useCase = new HandleGoogleOAuthCallback(mockGoogle())
		const result = await useCase.run({
			code: 'code',
			state: 'state-ok',
			stateCookie: 'cookie',
		})

		expect(result.kind).toBe('pending')
		if (result.kind !== 'pending') return
		expect(result.flow).toBe('register')
		expect(result.redirectPath).toBe('/register/google')
	})

	it('cancela troca de e-mail e limpa verified quando Google não verificou', async () => {
		const user = buildUser({
			googleLinkedAt: new Date(),
			emailVerifiedAt: new Date(),
			pendingEmail: 'new@example.com',
			emailTokenPurpose: 'change_new',
		})
		const clearEmailChangeChallenge = jest.fn().mockResolvedValue({
			...user,
			pendingEmail: null,
			emailTokenPurpose: null,
		})
		const clearEmailVerified = jest.fn().mockResolvedValue({
			...user,
			pendingEmail: null,
			emailVerifiedAt: null,
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailIncludingDeleted: jest.fn().mockResolvedValue(user),
			findByPendingEmail: jest.fn(),
			clearEmailChangeChallenge,
			clearEmailVerified,
			markEmailVerified: jest.fn(),
			linkGoogle: jest.fn(),
			updateLastLoginDevice: jest.fn().mockResolvedValue(undefined),
		}))

		const email = new EmailService()
		const useCase = new HandleGoogleOAuthCallback(mockGoogle({ emailVerified: false }), email)
		const result = await useCase.run({
			code: 'code',
			state: 'state-ok',
			stateCookie: 'cookie',
			deviceCookie: KNOWN_DEVICE,
		})

		expect(clearEmailChangeChallenge).toHaveBeenCalledWith('user-1')
		expect(clearEmailVerified).toHaveBeenCalledWith('user-1')
		expect(result.kind).toBe('session')
		if (result.kind !== 'session') return
		expect(result.redirectPath).toContain('emailChangeCancelled=1')
		expect(result.redirectPath).toContain('googleEmailUnverified=1')
		expect(email.send).not.toHaveBeenCalled()
	})

	it('pending link não muta conta antes da confirmação com senha', async () => {
		const user = buildUser({
			googleLinkedAt: null,
			passwordHash: 'hash',
			emailVerifiedAt: new Date(),
			pendingEmail: 'new@example.com',
			emailTokenPurpose: 'change_new',
		})
		const clearEmailChangeChallenge = jest.fn()
		const clearEmailVerified = jest.fn()
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailIncludingDeleted: jest.fn().mockResolvedValue(null),
			findByPendingEmail: jest.fn().mockResolvedValue(user),
			clearEmailChangeChallenge,
			clearEmailVerified,
		}))

		const useCase = new HandleGoogleOAuthCallback(mockGoogle({ email: 'new@example.com', emailVerified: false }))
		const result = await useCase.run({
			code: 'code',
			state: 'state-ok',
			stateCookie: 'cookie',
		})

		expect(result.kind).toBe('pending')
		if (result.kind !== 'pending') return
		expect(result.flow).toBe('link')
		expect(clearEmailChangeChallenge).not.toHaveBeenCalled()
		expect(clearEmailVerified).not.toHaveBeenCalled()
		expect(signGoogleOAuthPendingToken).toHaveBeenCalledWith(
			expect.objectContaining({
				flow: 'link',
				userId: 'user-1',
				email: 'new@example.com',
				emailChangeCancelled: true,
				googleEmailUnverified: true,
			})
		)
		expect(result.redirectPath).toContain('emailChangeCancelled=1')
		expect(result.redirectPath).toContain('googleEmailUnverified=1')
	})

	it('match via pendingEmail com googleLinkedAt não abre session (exige senha)', async () => {
		const user = buildUser({
			googleLinkedAt: new Date(),
			passwordHash: 'hash',
			emailVerifiedAt: new Date(),
			pendingEmail: 'attacker@gmail.com',
			emailTokenPurpose: 'change_new',
		})
		const clearEmailChangeChallenge = jest.fn()
		const linkGoogle = jest.fn()
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailIncludingDeleted: jest.fn().mockResolvedValue(null),
			findByPendingEmail: jest.fn().mockResolvedValue(user),
			clearEmailChangeChallenge,
			linkGoogle,
		}))

		const useCase = new HandleGoogleOAuthCallback(mockGoogle({ email: 'attacker@gmail.com', emailVerified: true }))
		const result = await useCase.run({
			code: 'code',
			state: 'state-ok',
			stateCookie: 'cookie',
		})

		expect(result.kind).toBe('pending')
		if (result.kind !== 'pending') return
		expect(result.flow).toBe('link')
		expect(clearEmailChangeChallenge).not.toHaveBeenCalled()
		expect(linkGoogle).not.toHaveBeenCalled()
	})
})
