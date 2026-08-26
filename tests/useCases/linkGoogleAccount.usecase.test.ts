jest.mock('@/utils/publicUserAccess', () => ({
	toPublicUserWithSignedPhoto: jest.fn(async (user: import('@/repositories/User.repository').UserEntity) => ({
		id: user.id ?? 'user-1',
		name: user.name ?? null,
		nickname: user.nickname ?? 'alice',
		email: user.email ?? 'alice@example.com',
		photoUrl: user.photoUrl ?? null,
		settings: user.settings ?? [],
		emailVerifiedAt: user.emailVerifiedAt ?? null,
		pendingEmail: user.pendingEmail ?? null,
		emailChallenge: 'none' as const,
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
			jti: 'jti-link',
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

jest.mock('@/utils/password', () => {
	const actual = jest.requireActual<typeof import('@/utils/password')>('@/utils/password')
	return {
		...actual,
		verifyPassword: jest.fn(),
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
		verifyGoogleOAuthPendingToken: jest.fn(),
	}
})

import LinkGoogleAccount from '@/useCases/linkGoogleAccount.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { UnauthorizedError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import EmailService from '@/services/Email/Email.service'
import { verifyPassword } from '@/utils/password'
import { verifyGoogleOAuthPendingToken } from '@/utils/googleOAuthCookies'
import { buildUser } from '../factories'

const KNOWN_DEVICE = '11111111-1111-4111-8111-111111111111'

function pendingLink(overrides: Partial<Awaited<ReturnType<typeof verifyGoogleOAuthPendingToken>>> = {}) {
	return {
		flow: 'link' as const,
		email: 'new@example.com',
		userId: 'user-1',
		name: 'Alice',
		picture: null,
		emailVerified: true,
		returnUrl: '/',
		emailChangeCancelled: false,
		googleEmailUnverified: false,
		...overrides,
	}
}

describe('LinkGoogleAccount', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(verifyPassword).mockResolvedValue(true)
		jest.mocked(verifyGoogleOAuthPendingToken).mockResolvedValue(pendingLink())
	})

	it('vincula por userId (match via pendingEmail) e não exige findByEmail do Google', async () => {
		const user = buildUser({
			email: 'alice@example.com',
			passwordHash: 'hash',
			googleLinkedAt: null,
			pendingEmail: 'new@example.com',
			emailTokenPurpose: 'change_new',
			emailVerifiedAt: new Date(),
			name: 'Existing',
			photoUrl: 'https://cdn.example/a.jpg',
		})
		const linkGoogle = jest.fn().mockResolvedValue({ ...user, googleLinkedAt: new Date() })
		const clearEmailChangeChallenge = jest.fn().mockResolvedValue({
			...user,
			pendingEmail: null,
			emailTokenPurpose: null,
		})
		const findByEmail = jest.fn()
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(user),
			findByEmail,
			linkGoogle,
			clearEmailChangeChallenge,
			markEmailVerified: jest.fn(),
			clearEmailVerified: jest.fn(),
			updateLastLoginDevice: jest.fn().mockResolvedValue(undefined),
		}))

		jest.mocked(verifyGoogleOAuthPendingToken).mockResolvedValue(
			pendingLink({ email: 'new@example.com', emailChangeCancelled: true })
		)

		const email = new EmailService()
		const useCase = new LinkGoogleAccount(email)
		const result = await useCase.run({
			password: 'Secret1!',
			pendingCookie: 'pending',
			deviceCookie: KNOWN_DEVICE,
		})

		expect(findByEmail).not.toHaveBeenCalled()
		expect(clearEmailChangeChallenge).toHaveBeenCalledWith('user-1')
		expect(linkGoogle).toHaveBeenCalledWith('user-1')
		expect(result.returnUrl).toBe('/')
		expect(result.token).toBe('session-token')
		expect(email.send).toHaveBeenCalledTimes(1)
	})

	it('após senha, limpa verified quando Google não verificou o e-mail', async () => {
		const user = buildUser({
			passwordHash: 'hash',
			googleLinkedAt: null,
			emailVerifiedAt: new Date(),
		})
		const clearEmailVerified = jest.fn().mockResolvedValue({ ...user, emailVerifiedAt: null })
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(user),
			linkGoogle: jest.fn().mockResolvedValue({ ...user, googleLinkedAt: new Date() }),
			clearEmailChangeChallenge: jest.fn(),
			markEmailVerified: jest.fn(),
			clearEmailVerified,
			updateLastLoginDevice: jest.fn().mockResolvedValue(undefined),
		}))

		jest.mocked(verifyGoogleOAuthPendingToken).mockResolvedValue(
			pendingLink({ emailVerified: false, googleEmailUnverified: true })
		)

		const email = new EmailService()
		const useCase = new LinkGoogleAccount(email)
		await useCase.run({
			password: 'Secret1!',
			pendingCookie: 'pending',
			deviceCookie: KNOWN_DEVICE,
		})

		expect(clearEmailVerified).toHaveBeenCalledWith('user-1')
		expect(email.send).not.toHaveBeenCalled()
	})

	it('rejeita senha inválida sem mutar a conta', async () => {
		const user = buildUser({ passwordHash: 'hash', googleLinkedAt: null })
		const linkGoogle = jest.fn()
		const clearEmailChangeChallenge = jest.fn()
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(user),
			linkGoogle,
			clearEmailChangeChallenge,
			markEmailVerified: jest.fn(),
			clearEmailVerified: jest.fn(),
		}))
		jest.mocked(verifyPassword).mockResolvedValue(false)

		const useCase = new LinkGoogleAccount()
		await expect(
			useCase.run({
				password: 'wrong',
				pendingCookie: 'pending',
			})
		).rejects.toBeInstanceOf(UnauthorizedError)

		expect(linkGoogle).not.toHaveBeenCalled()
		expect(clearEmailChangeChallenge).not.toHaveBeenCalled()
	})
})
