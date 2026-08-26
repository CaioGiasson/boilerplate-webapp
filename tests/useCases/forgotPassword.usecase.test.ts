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

import ForgotPassword from '@/useCases/forgotPassword.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import LogManager from '@/managers/Log.manager'
import { ValidationError } from '@/errors'
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

describe('ForgotPassword', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('rejeita e-mail inválido', async () => {
		await expect(new ForgotPassword().run({ email: 'not-an-email' })).rejects.toBeInstanceOf(ValidationError)
	})

	it('sempre retorna ok sem enviar e-mail quando usuário não existe', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmail: jest.fn().mockResolvedValue(null),
			setEmailChallenge: jest.fn(),
		}))

		const emailService = new EmailService()
		const result = await new ForgotPassword(emailService).run({
			email: 'missing@example.com',
			locale: 'pt',
		})

		expect(result).toEqual({ ok: true })
		expect(emailService.send).not.toHaveBeenCalled()
	})

	it('não envia e-mail para conta não verificada, mas retorna ok genérico', async () => {
		const setEmailChallenge = jest.fn()
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmail: jest.fn().mockResolvedValue({ ...baseUser, emailVerifiedAt: null }),
			setEmailChallenge,
		}))

		const emailService = new EmailService()
		const result = await new ForgotPassword(emailService).run({
			email: 'ada@example.com',
			locale: 'en',
		})

		expect(result).toEqual({ ok: true })
		expect(setEmailChallenge).not.toHaveBeenCalled()
		expect(emailService.send).not.toHaveBeenCalled()
	})

	it('emite desafio password_reset e envia e-mail para conta verificada', async () => {
		const setEmailChallenge = jest.fn().mockResolvedValue({
			...baseUser,
			emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
			emailTokenPurpose: 'password_reset',
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmail: jest.fn().mockResolvedValue({
				...baseUser,
				emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
			}),
			setEmailChallenge,
		}))

		const emailService = new EmailService()
		const result = await new ForgotPassword(emailService).run({
			email: 'Ada@Example.com',
			locale: 'pt',
		})

		expect(result).toEqual({ ok: true })
		expect(setEmailChallenge).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ purpose: 'password_reset', pendingEmail: null })
		)
		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'ada@example.com',
				subject: expect.any(String),
				text: expect.stringMatching(/password reset code is:\n\n[A-Z0-9]{8}\n/),
			})
		)
		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				text: expect.stringContaining('/pt/reset-password?token='),
			})
		)
	})

	it('retorna ok genérico mesmo se o envio de e-mail falhar', async () => {
		const setEmailChallenge = jest.fn().mockResolvedValue({})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByEmail: jest.fn().mockResolvedValue({
				...baseUser,
				emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
			}),
			setEmailChallenge,
		}))

		const emailService = new EmailService()
		jest.mocked(emailService.send).mockRejectedValueOnce(new Error('smtp down'))
		const logSpy = jest.spyOn(LogManager, 'error').mockImplementation(() => undefined)

		const result = await new ForgotPassword(emailService).run({
			email: 'ada@example.com',
		})

		expect(result).toEqual({ ok: true })
		expect(setEmailChallenge).toHaveBeenCalled()
		expect(logSpy).toHaveBeenCalledWith('Failed to send password-reset email', expect.any(Error))
		logSpy.mockRestore()
	})
})
