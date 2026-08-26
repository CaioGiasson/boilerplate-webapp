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

jest.mock('@/config/env', () => {
	const actual = jest.requireActual('@/config/env') as typeof import('@/config/env')
	return {
		...actual,
		getAppBaseUrl: jest.fn(() => 'https://vitraux.test'),
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

import ConfirmEmailChallenge from '@/useCases/confirmEmailChallenge.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { NotFoundError, ValidationError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import EmailService from '@/services/Email/Email.service'
import { createEmailToken } from '@/utils/emailToken'

const baseUser = {
	id: 'user-1',
	name: null,
	nickname: 'ada',
	email: 'ada@example.com',
	passwordHash: 'hash',
	photoUrl: null,
	settings: [],
	acceptedTermsAt: null,
	acceptedPrivacyAt: null,
	termsVersion: null,
	privacyVersion: null,
	dateOfBirth: null,
	ageVerifiedAt: null,
	emailVerifiedAt: null as Date | null,
	pendingEmail: null as string | null,
	emailTokenHash: null as string | null,
	emailTokenPurpose: null as string | null,
	emailTokenExpiresAt: null as Date | null,
	createdAt: new Date('2026-08-19T00:00:00.000Z'),
	updatedAt: new Date('2026-08-19T00:00:00.000Z'),
	deletedAt: null,
	sessionsRevokedAt: null,
}

describe('ConfirmEmailChallenge', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('rejeita token vazio', async () => {
		await expect(new ConfirmEmailChallenge().run({ token: '  ' })).rejects.toBeInstanceOf(ValidationError)
	})

	it('confirma verificação de e-mail', async () => {
		const { token, hash } = createEmailToken()
		const findByEmailTokenHash = jest.fn().mockResolvedValue({
			...baseUser,
			emailTokenHash: hash,
			emailTokenPurpose: 'verify',
			emailTokenExpiresAt: new Date(Date.now() + 3600_000),
		})
		const markEmailVerified = jest.fn().mockResolvedValue({
			...baseUser,
			emailVerifiedAt: new Date('2026-08-20T00:00:00.000Z'),
			emailTokenHash: null,
			emailTokenPurpose: null,
			emailTokenExpiresAt: null,
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash,
			markEmailVerified,
		}))

		const emailService = new EmailService()
		const result = await new ConfirmEmailChallenge(emailService).run({ token, locale: 'en' })

		expect(markEmailVerified).toHaveBeenCalledWith('user-1')
		expect(result.user.emailVerifiedAt).toBeTruthy()
		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'ada@example.com',
				subject: expect.stringMatching(/verified/i),
			})
		)
	})

	it('após change_old envia desafio ao novo e-mail', async () => {
		const { token, hash } = createEmailToken()
		const findByEmailTokenHash = jest.fn().mockResolvedValue({
			...baseUser,
			pendingEmail: 'new@example.com',
			emailTokenHash: hash,
			emailTokenPurpose: 'change_old',
			emailTokenExpiresAt: new Date(Date.now() + 3600_000),
		})
		const setEmailChallenge = jest.fn().mockResolvedValue({
			...baseUser,
			pendingEmail: 'new@example.com',
			emailTokenPurpose: 'change_new',
			emailTokenHash: 'next',
			emailTokenExpiresAt: new Date(Date.now() + 3600_000),
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash,
			setEmailChallenge,
		}))

		const emailService = new EmailService()
		const result = await new ConfirmEmailChallenge(emailService).run({
			token,
			locale: 'es',
		})

		expect(setEmailChallenge).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ purpose: 'change_new', pendingEmail: 'new@example.com' })
		)
		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'new@example.com',
				text: expect.stringContaining('/es/confirm-email-change?token='),
			})
		)
		expect(result.user.emailChallenge).toBe('change_new')
	})

	it('aplica pendingEmail em change_new', async () => {
		const { token, hash } = createEmailToken()
		const findByEmailTokenHash = jest.fn().mockResolvedValue({
			...baseUser,
			pendingEmail: 'new@example.com',
			emailTokenHash: hash,
			emailTokenPurpose: 'change_new',
			emailTokenExpiresAt: new Date(Date.now() + 3600_000),
		})
		const applyPendingEmail = jest.fn().mockResolvedValue({
			...baseUser,
			email: 'new@example.com',
			pendingEmail: null,
			emailVerifiedAt: new Date('2026-08-20T00:00:00.000Z'),
			emailTokenHash: null,
			emailTokenPurpose: null,
			emailTokenExpiresAt: null,
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash,
			applyPendingEmail,
		}))

		const result = await new ConfirmEmailChallenge().run({ token })

		expect(applyPendingEmail).toHaveBeenCalledWith('user-1', 'new@example.com')
		expect(result.user.email).toBe('new@example.com')
	})

	it('rejeita token inexistente', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash: jest.fn().mockResolvedValue(null),
		}))

		await expect(new ConfirmEmailChallenge().run({ token: 'XXXXXXXX' })).rejects.toBeInstanceOf(NotFoundError)
	})

	it('rejeita token expirado e limpa desafio', async () => {
		const { token, hash } = createEmailToken()
		const clearEmailChallenge = jest.fn().mockResolvedValue({ ...baseUser })
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmailTokenHash: jest.fn().mockResolvedValue({
				...baseUser,
				emailTokenHash: hash,
				emailTokenPurpose: 'verify',
				emailTokenExpiresAt: new Date(Date.now() - 1000),
			}),
			clearEmailChallenge,
		}))

		await expect(new ConfirmEmailChallenge().run({ token })).rejects.toBeInstanceOf(ValidationError)
		expect(clearEmailChallenge).toHaveBeenCalledWith('user-1')
	})
})
