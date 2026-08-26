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

import SendEmailVerification from '@/useCases/sendEmailVerification.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { NotFoundError, ValidationError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import EmailService from '@/services/Email/Email.service'

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
	pendingEmail: null,
	emailTokenHash: null,
	emailTokenPurpose: null,
	emailTokenExpiresAt: null,
	createdAt: new Date('2026-08-19T00:00:00.000Z'),
	updatedAt: new Date('2026-08-19T00:00:00.000Z'),
	deletedAt: null,
	sessionsRevokedAt: null,
}

describe('SendEmailVerification', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('rejeita userId vazio', async () => {
		await expect(new SendEmailVerification().run({ userId: '  ' })).rejects.toBeInstanceOf(ValidationError)
	})

	it('não reenvia se já verificado', async () => {
		const findById = jest.fn().mockResolvedValue({
			...baseUser,
			emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById,
			setEmailChallenge: jest.fn(),
		}))

		const emailService = new EmailService()
		const useCase = new SendEmailVerification(emailService)
		const result = await useCase.run({ userId: 'user-1', locale: 'pt' })

		expect(result.sent).toBe(false)
		expect(emailService.send).not.toHaveBeenCalled()
	})

	it('emite desafio e envia e-mail', async () => {
		const findById = jest.fn().mockResolvedValue({ ...baseUser })
		const setEmailChallenge = jest.fn().mockResolvedValue({
			...baseUser,
			emailTokenPurpose: 'verify',
			emailTokenHash: 'hash',
			emailTokenExpiresAt: new Date(Date.now() + 3600_000),
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById,
			setEmailChallenge,
		}))

		const emailService = new EmailService()
		const useCase = new SendEmailVerification(emailService)
		const result = await useCase.run({ userId: 'user-1', locale: 'pt' })

		expect(result.sent).toBe(true)
		expect(setEmailChallenge).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ purpose: 'verify', pendingEmail: null })
		)
		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'ada@example.com',
				subject: expect.any(String),
				text: expect.stringMatching(/verification code is:\n\n[A-Z0-9]{8}\n/),
			})
		)
		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				text: expect.stringContaining('/pt/verify-email?token='),
			})
		)
	})

	it('lança NotFound quando usuário não existe', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(null),
		}))

		await expect(new SendEmailVerification().run({ userId: 'missing' })).rejects.toBeInstanceOf(NotFoundError)
	})
})
