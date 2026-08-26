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
		getAppBaseUrl: jest.fn(() => 'https://app.test'),
	}
})

jest.mock('@/utils/password', () => {
	const actual = jest.requireActual('@/utils/password') as typeof import('@/utils/password')
	return {
		...actual,
		verifyPassword: jest.fn(async () => true),
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

import RequestEmailChange from '@/useCases/requestEmailChange.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { NotFoundError, ValidationError } from '@/errors'
import UserRepository from '@/repositories/User.repository'
import EmailService from '@/services/Email/Email.service'
import { verifyPassword } from '@/utils/password'

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
	emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
	pendingEmail: null,
	emailTokenHash: null,
	emailTokenPurpose: null,
	emailTokenExpiresAt: null,
	createdAt: new Date('2026-08-19T00:00:00.000Z'),
	updatedAt: new Date('2026-08-19T00:00:00.000Z'),
	deletedAt: null,
	sessionsRevokedAt: null,
}

describe('RequestEmailChange', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
		;(verifyPassword as jest.Mock).mockResolvedValue(true)
	})

	it('rejeita e-mail inválido', async () => {
		await expect(
			new RequestEmailChange().run({
				userId: 'user-1',
				password: 'Abcdef12',
				newEmail: 'not-an-email',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita senha incorreta', async () => {
		;(verifyPassword as jest.Mock).mockResolvedValue(false)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue({ ...baseUser }),
		}))

		await expect(
			new RequestEmailChange().run({
				userId: 'user-1',
				password: 'wrong',
				newEmail: 'new@example.com',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita troca quando o e-mail atual não está verificado', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue({ ...baseUser, emailVerifiedAt: null }),
		}))

		await expect(
			new RequestEmailChange().run({
				userId: 'user-1',
				password: 'Abcdef12',
				newEmail: 'new@example.com',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita e-mail igual ao atual', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue({ ...baseUser }),
			findByEmail: jest.fn(),
		}))

		await expect(
			new RequestEmailChange().run({
				userId: 'user-1',
				password: 'Abcdef12',
				newEmail: 'ada@example.com',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('inicia change_old e envia e-mail ao endereço atual', async () => {
		const setEmailChallenge = jest.fn().mockResolvedValue({
			...baseUser,
			pendingEmail: 'new@example.com',
			emailTokenPurpose: 'change_old',
			emailTokenHash: 'hash',
			emailTokenExpiresAt: new Date(Date.now() + 3600_000),
		})
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue({ ...baseUser }),
			findByEmail: jest.fn().mockResolvedValue(null),
			setEmailChallenge,
		}))

		const emailService = new EmailService()
		const result = await new RequestEmailChange(emailService).run({
			userId: 'user-1',
			password: 'Abcdef12',
			newEmail: 'new@example.com',
			locale: 'pt',
		})

		expect(setEmailChallenge).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ purpose: 'change_old', pendingEmail: 'new@example.com' })
		)
		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'ada@example.com',
				text: expect.stringContaining('/pt/confirm-email-change?token='),
			})
		)
		expect(result.user.emailChallenge).toBe('change_old')
		expect(result.user.pendingEmail).toBe('new@example.com')
	})

	it('lança NotFound quando usuário não existe', async () => {
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findById: jest.fn().mockResolvedValue(null),
		}))

		await expect(
			new RequestEmailChange().run({
				userId: 'missing',
				password: 'Abcdef12',
				newEmail: 'new@example.com',
			})
		).rejects.toBeInstanceOf(NotFoundError)
	})
})
