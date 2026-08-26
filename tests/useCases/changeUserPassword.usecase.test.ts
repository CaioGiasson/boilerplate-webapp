jest.mock('@/utils/publicUserAccess', () => ({
	toPublicUserWithSignedPhoto: jest.fn(async (user: import('@/repositories/User.repository').UserEntity) => ({
		id: user.id,
		name: user.name,
		nickname: user.nickname,
		email: user.email,
		photoUrl: user.photoUrl,
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
			token: 'token',
			jti: 'jti-1',
			exp: Math.floor(Date.now() / 1000) + 3600,
		})),
		createSessionDeviceId: jest.fn(() => '22222222-2222-4222-8222-222222222222'),
	}
})

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({
		create: jest.fn().mockResolvedValue({ id: 'session-1' }),
		deleteAllForUserExceptJti: jest.fn().mockResolvedValue(undefined),
	}))
})

jest.mock('@/utils/password', () => {
	const actual = jest.requireActual<typeof import('@/utils/password')>('@/utils/password')
	return {
		...actual,
		verifyPassword: jest.fn(),
		hashPassword: jest.fn(async () => 'new-hash'),
		assertPasswordPolicy: jest.fn(),
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

import ChangeUserPassword from '@/useCases/changeUserPassword.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { UnauthorizedError, ValidationError } from '@/errors'
import { verifyPassword } from '@/utils/password'
import UserRepository from '@/repositories/User.repository'
import { buildUser } from '../factories'

describe('ChangeUserPassword', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(verifyPassword).mockResolvedValue(true)
	})

	it('permite definir a primeira senha (Google, sem senha) com current vazio', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest
				.fn()
				.mockResolvedValue(
					buildUser({ passwordHash: null, googleLinkedAt: new Date('2026-08-26T00:00:00.000Z') })
				),
			updatePassword: jest.fn().mockResolvedValue(undefined),
		}))

		const result = await new ChangeUserPassword().run({
			userId: 'user-1',
			currentPassword: '',
			newPassword: 'Abcdef1!',
			newPasswordConfirmation: 'Abcdef1!',
		})
		expect(result.ok).toBe(true)
		expect(verifyPassword).not.toHaveBeenCalled()
	})

	it('exige senha atual quando já há passwordHash', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(buildUser({ passwordHash: 'hash', googleLinkedAt: null })),
			updatePassword: jest.fn().mockResolvedValue(undefined),
		}))

		await expect(
			new ChangeUserPassword().run({
				userId: 'user-1',
				currentPassword: '',
				newPassword: 'Abcdef1!',
				newPasswordConfirmation: 'Abcdef1!',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('pede suporte quando não há senha nem Google', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(buildUser({ passwordHash: null, googleLinkedAt: null })),
		}))

		await expect(
			new ChangeUserPassword().run({
				userId: 'user-1',
				currentPassword: '',
				newPassword: 'Abcdef1!',
				newPasswordConfirmation: 'Abcdef1!',
			})
		).rejects.toMatchObject({ code: 'ACCOUNT_SUPPORT_REQUIRED' })
	})

	it('rejeita senha atual inválida (tipo B)', async () => {
		jest.mocked(verifyPassword).mockResolvedValue(false)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(buildUser({ passwordHash: 'hash' })),
		}))

		await expect(
			new ChangeUserPassword().run({
				userId: 'user-1',
				currentPassword: 'wrong',
				newPassword: 'Abcdef1!',
				newPasswordConfirmation: 'Abcdef1!',
			})
		).rejects.toBeInstanceOf(UnauthorizedError)
	})
})
