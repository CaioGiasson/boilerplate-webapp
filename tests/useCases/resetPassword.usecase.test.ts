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

jest.mock('@/utils/password', () => {
	const actual = jest.requireActual('@/utils/password') as typeof import('@/utils/password')
	return {
		...actual,
		hashPassword: jest.fn(async () => 'new-hash'),
	}
})

import ResetPassword from '@/useCases/resetPassword.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { ValidationError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import { createEmailToken } from '@/utils/emailToken'
import { hashPassword } from '@/utils/password'

const baseUser = {
	id: 'user-1',
	name: null,
	nickname: 'ada',
	email: 'ada@example.com',
	passwordHash: 'old-hash',
	photoUrl: null,
	settings: [],
	acceptedTermsAt: null,
	acceptedPrivacyAt: null,
	termsVersion: null,
	privacyVersion: null,
	dateOfBirth: null,
	ageVerifiedAt: null,
	emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z') as Date | null,
	pendingEmail: null as string | null,
	emailTokenHash: null as string | null,
	emailTokenPurpose: null as string | null,
	emailTokenExpiresAt: null as Date | null,
	createdAt: new Date('2026-08-19T00:00:00.000Z'),
	updatedAt: new Date('2026-08-19T00:00:00.000Z'),
	deletedAt: null,
	sessionsRevokedAt: null,
}

describe('ResetPassword', () => {
	mockPrismaRuntime({})

	const strongPassword = 'Abcdef1!'

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('rejeita código inválido', async () => {
		await expect(
			new ResetPassword().run({
				token: 'short',
				newPassword: strongPassword,
				newPasswordConfirmation: strongPassword,
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita confirmação divergente', async () => {
		const { token } = createEmailToken()
		await expect(
			new ResetPassword().run({
				token,
				newPassword: strongPassword,
				newPasswordConfirmation: 'Other1!x',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('atualiza senha, limpa challenge e usa updatePasswordClearingEmailChallenge (sessionsRevokedAt)', async () => {
		const { token, hash } = createEmailToken()
		const updatePasswordClearingEmailChallenge = jest.fn().mockResolvedValue(undefined)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash: jest.fn().mockResolvedValue({
				...baseUser,
				emailTokenHash: hash,
				emailTokenPurpose: 'password_reset',
				emailTokenExpiresAt: new Date(Date.now() + 3600_000),
			}),
			updatePasswordClearingEmailChallenge,
			clearEmailChallenge: jest.fn(),
		}))

		const result = await new ResetPassword().run({
			token,
			newPassword: strongPassword,
			newPasswordConfirmation: strongPassword,
		})

		expect(result).toEqual({ ok: true })
		expect(hashPassword).toHaveBeenCalledWith(strongPassword)
		expect(updatePasswordClearingEmailChallenge).toHaveBeenCalledWith('user-1', 'new-hash')
	})

	it('rejeita challenge com purpose diferente de password_reset', async () => {
		const { token, hash } = createEmailToken()
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash: jest.fn().mockResolvedValue({
				...baseUser,
				emailTokenHash: hash,
				emailTokenPurpose: 'verify',
				emailTokenExpiresAt: new Date(Date.now() + 3600_000),
			}),
			updatePassword: jest.fn(),
			clearEmailChallenge: jest.fn(),
		}))

		await expect(
			new ResetPassword().run({
				token,
				newPassword: strongPassword,
				newPasswordConfirmation: strongPassword,
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('proíbe reset quando a conta não está verificada', async () => {
		const { token, hash } = createEmailToken()
		const clearEmailChallenge = jest.fn().mockResolvedValue({ ...baseUser })
		const updatePassword = jest.fn()
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash: jest.fn().mockResolvedValue({
				...baseUser,
				emailVerifiedAt: null,
				emailTokenHash: hash,
				emailTokenPurpose: 'password_reset',
				emailTokenExpiresAt: new Date(Date.now() + 3600_000),
			}),
			updatePassword,
			clearEmailChallenge,
		}))

		await expect(
			new ResetPassword().run({
				token,
				newPassword: strongPassword,
				newPasswordConfirmation: strongPassword,
			})
		).rejects.toBeInstanceOf(ValidationError)

		expect(updatePassword).not.toHaveBeenCalled()
		expect(clearEmailChallenge).toHaveBeenCalledWith('user-1')
	})

	it('rejeita token expirado e limpa challenge', async () => {
		const { token, hash } = createEmailToken()
		const clearEmailChallenge = jest.fn().mockResolvedValue({ ...baseUser })
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash: jest.fn().mockResolvedValue({
				...baseUser,
				emailTokenHash: hash,
				emailTokenPurpose: 'password_reset',
				emailTokenExpiresAt: new Date(Date.now() - 1000),
			}),
			updatePassword: jest.fn(),
			clearEmailChallenge,
		}))

		await expect(
			new ResetPassword().run({
				token,
				newPassword: strongPassword,
				newPasswordConfirmation: strongPassword,
			})
		).rejects.toBeInstanceOf(ValidationError)

		expect(clearEmailChallenge).toHaveBeenCalledWith('user-1')
	})
})
