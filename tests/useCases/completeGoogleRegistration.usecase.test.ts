jest.mock('@/utils/publicUserAccess', () => ({
	toPublicUserWithSignedPhoto: jest.fn(async (user: import('@/repositories/User.repository').UserEntity) => ({
		id: user.id ?? 'user-1',
		name: user.name ?? null,
		nickname: user.nickname ?? 'alice',
		email: user.email ?? 'alice@example.com',
		photoUrl: null,
		settings: user.settings ?? [],
		emailVerifiedAt: user.emailVerifiedAt ?? null,
		pendingEmail: null,
		emailChallenge: 'none',
		hasPassword: false,
		googleLinked: true,
	})),
}))

jest.mock('@/utils/session', () => {
	const actual = jest.requireActual<typeof import('@/utils/session')>('@/utils/session')
	return {
		...actual,
		signSessionToken: jest.fn(async () => ({
			token: 'session-token',
			jti: 'jti-reg',
			exp: Math.floor(Date.now() / 1000) + 3600,
		})),
	}
})

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({
		create: jest.fn().mockResolvedValue({ id: 'session-1' }),
	}))
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
		verifyGoogleOAuthPendingToken: jest.fn(async () => ({
			flow: 'register' as const,
			email: 'newuser@example.com',
			userId: null,
			name: 'New User',
			picture: null,
			emailVerified: true,
			returnUrl: '/welcome',
			emailChangeCancelled: false,
			googleEmailUnverified: false,
		})),
	}
})

jest.mock('@/services/Image/RemoteImage.service', () => {
	return jest.fn().mockImplementation(() => ({
		fetch: jest.fn().mockRejectedValue(new Error('skip photo')),
	}))
})

import CompleteGoogleRegistration from '@/useCases/completeGoogleRegistration.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { ValidationError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import { verifyGoogleOAuthPendingToken } from '@/utils/googleOAuthCookies'
import { buildUser } from '../factories'

describe('CompleteGoogleRegistration', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(verifyGoogleOAuthPendingToken).mockResolvedValue({
			flow: 'register',
			email: 'newuser@example.com',
			userId: null,
			name: 'New User',
			picture: null,
			emailVerified: true,
			returnUrl: '/welcome',
			emailChangeCancelled: false,
			googleEmailUnverified: false,
		})
	})

	it('rejeita menor de 18', async () => {
		const useCase = new CompleteGoogleRegistration()
		await expect(
			useCase.run({
				birthDate: '2015-01-01',
				acceptedTerms: true,
				acceptedPrivacy: true,
				pendingCookie: 'pending',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('cria usuário Google sem senha e emite sessão', async () => {
		const created = buildUser({
			id: 'user-new',
			email: 'newuser@example.com',
			nickname: 'newuser',
			name: 'New User',
			passwordHash: null,
			googleLinkedAt: new Date(),
			emailVerifiedAt: new Date(),
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmail: jest.fn().mockResolvedValue(null),
			findByNickname: jest.fn().mockResolvedValue(null),
			create: jest.fn().mockResolvedValue(created),
			updateProfile: jest.fn(),
			updateLastLoginDevice: jest.fn().mockResolvedValue(undefined),
			linkGoogle: jest.fn(),
		}))

		const useCase = new CompleteGoogleRegistration()
		const result = await useCase.run({
			birthDate: '1990-05-05',
			acceptedTerms: true,
			acceptedPrivacy: true,
			pendingCookie: 'pending',
		})

		expect(result.returnUrl).toBe('/welcome')
		expect(result.token).toBe('session-token')
		expect(result.user.email).toBe('newuser@example.com')
	})
})
