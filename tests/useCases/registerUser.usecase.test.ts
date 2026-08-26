jest.mock('@/utils/session', () => {
	const actual = jest.requireActual<typeof import('@/utils/session')>('@/utils/session')
	return {
		...actual,
		signSessionToken: jest.fn(async () => ({
			token: 'token',
			jti: 'jti-1',
			exp: Math.floor(Date.now() / 1000) + 3600,
		})),
	}
})

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({
		create: jest.fn().mockResolvedValue({ id: 'session-1' }),
	}))
})

jest.mock('@/utils/password', () => {
	const actual = jest.requireActual('@/utils/password') as typeof import('@/utils/password')
	return {
		...actual,
		hashPassword: jest.fn(async () => 'hashed-password'),
	}
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
		default: jest.fn().mockImplementation(() => ({
			findByNickname: jest.fn().mockResolvedValue(null),
			findByEmail: jest.fn().mockResolvedValue(null),
			create: jest.fn(async (input: Record<string, unknown>) => ({
				id: 'user-1',
				name: null,
				nickname: input.nickname,
				email: input.email,
				passwordHash: input.passwordHash,
				photoUrl: null,
				settings: input.settings ?? [],
				acceptedTermsAt: input.acceptedTermsAt ?? null,
				acceptedPrivacyAt: input.acceptedPrivacyAt ?? null,
				termsVersion: input.termsVersion ?? null,
				privacyVersion: input.privacyVersion ?? null,
				dateOfBirth: input.dateOfBirth ?? null,
				ageVerifiedAt: input.ageVerifiedAt ?? null,
				emailVerifiedAt: null,
				pendingEmail: null,
				emailTokenHash: null,
				emailTokenPurpose: null,
				emailTokenExpiresAt: null,
				createdAt: new Date('2026-08-19T00:00:00.000Z'),
				updatedAt: new Date('2026-08-19T00:00:00.000Z'),
				deletedAt: null,
				sessionsRevokedAt: null,
			})),
			setEmailChallenge: jest.fn(async (id: string, data: Record<string, unknown>) => ({
				id,
				name: null,
				nickname: 'alice',
				email: 'alice@example.com',
				passwordHash: 'hashed-password',
				photoUrl: null,
				settings: [],
				acceptedTermsAt: null,
				acceptedPrivacyAt: null,
				termsVersion: null,
				privacyVersion: null,
				dateOfBirth: null,
				ageVerifiedAt: null,
				emailVerifiedAt: null,
				pendingEmail: data.pendingEmail ?? null,
				emailTokenHash: data.tokenHash ?? null,
				emailTokenPurpose: data.purpose ?? null,
				emailTokenExpiresAt: data.expiresAt ?? null,
				createdAt: new Date('2026-08-19T00:00:00.000Z'),
				updatedAt: new Date('2026-08-19T00:00:00.000Z'),
				deletedAt: null,
				sessionsRevokedAt: null,
			})),
		})),
	}
})

import RegisterUser from '@/useCases/registerUser.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { ValidationError } from '@/errors'
import { LEGAL_VERSIONS } from '@/constants/legal'
import UserRepository from '@/repositories/User.repository'
import { signSessionToken } from '@/utils/session'
import { MAX_USER_SETTINGS, SETTINGS_KEYS } from '@/managers/Settings.manager'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const validInput = {
	nickname: 'alice',
	email: 'alice@example.com',
	password: 'Abcdef12',
	passwordConfirmation: 'Abcdef12',
	birthDate: '1990-01-15',
	device: 'device-1',
	acceptedTerms: true,
	acceptedPrivacy: true,
}

describe('RegisterUser', () => {
	mockPrismaRuntime({})

	it('rejeita confirmação de senha diferente', async () => {
		const useCase = new RegisterUser()

		await expect(
			useCase.run({
				...validInput,
				passwordConfirmation: 'Abcdef13',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita cadastro sem aceite dos termos e da privacidade', async () => {
		const useCase = new RegisterUser()

		await expect(
			useCase.run({
				...validInput,
				acceptedTerms: false,
				acceptedPrivacy: true,
			})
		).rejects.toBeInstanceOf(ValidationError)

		await expect(
			useCase.run({
				...validInput,
				acceptedTerms: true,
				acceptedPrivacy: false,
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('aceita cadastro com os flags e persiste versões e timestamps', async () => {
		const useCase = new RegisterUser()
		const result = await useCase.run(validInput)

		expect(result.user.nickname).toBe('alice')
		expect(result.token).toBe('token')
		expect(result.user).not.toHaveProperty('acceptedTermsAt')
		expect(result.user).not.toHaveProperty('termsVersion')
		expect(result.user).not.toHaveProperty('dateOfBirth')
		expect(result.user).not.toHaveProperty('ageVerifiedAt')

		const MockedRepository = UserRepository as unknown as jest.Mock
		const instance = MockedRepository.mock.results.at(-1)?.value as {
			create: jest.Mock
		}
		expect(instance.create).toHaveBeenCalledWith(
			expect.objectContaining({
				nickname: 'alice',
				email: 'alice@example.com',
				passwordHash: 'hashed-password',
				termsVersion: LEGAL_VERSIONS.terms,
				privacyVersion: LEGAL_VERSIONS.privacy,
				dateOfBirth: new Date(Date.UTC(1990, 0, 15)),
			})
		)
		const persisted = instance.create.mock.calls[0][0] as {
			acceptedTermsAt: Date
			acceptedPrivacyAt: Date
			ageVerifiedAt: Date
		}
		expect(persisted.acceptedTermsAt).toBeInstanceOf(Date)
		expect(persisted.acceptedPrivacyAt).toBeInstanceOf(Date)
		expect(persisted.ageVerifiedAt).toBeInstanceOf(Date)
	})

	it('rejeita menor de 18 anos', async () => {
		const useCase = new RegisterUser()

		await expect(
			useCase.run({
				...validInput,
				birthDate: '2015-01-01',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('aceita quem completa 18 anos no dia civil UTC', async () => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
		const useCase = new RegisterUser()

		await expect(
			useCase.run({
				...validInput,
				birthDate: '2008-08-20',
			})
		).resolves.toMatchObject({ token: 'token' })

		jest.useRealTimers()
	})

	it('rejeita data de nascimento inválida ou futura', async () => {
		const useCase = new RegisterUser()

		await expect(
			useCase.run({
				...validInput,
				birthDate: 'not-a-date',
			})
		).rejects.toBeInstanceOf(ValidationError)

		await expect(
			useCase.run({
				...validInput,
				birthDate: '2099-01-01',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('gera device no servidor e ignora o device do cliente', async () => {
		const useCase = new RegisterUser()
		await useCase.run({
			...validInput,
			device: 'forged-device',
		})

		const claims = jest.mocked(signSessionToken).mock.calls.at(-1)?.[0]
		expect(claims?.userId).toBe('user-1')
		expect(claims?.device).toMatch(UUID_PATTERN)
		expect(claims?.device).not.toBe('forged-device')
	})

	it('rejeita mass assignment no array de settings', async () => {
		const useCase = new RegisterUser()

		await expect(
			useCase.run({
				...validInput,
				settings: [{ key: '__proto__', value: true }],
			})
		).rejects.toBeInstanceOf(ValidationError)

		await expect(
			useCase.run({
				...validInput,
				settings: Array.from({ length: MAX_USER_SETTINGS + 1 }, () => ({
					key: SETTINGS_KEYS.DARK_MODE,
					value: true,
				})),
			})
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('persiste settings válidos no cadastro', async () => {
		const useCase = new RegisterUser()
		await useCase.run({
			...validInput,
			settings: [
				{ key: SETTINGS_KEYS.DARK_MODE, value: true },
				{ key: SETTINGS_KEYS.LANGUAGE, value: 'en' },
			],
		})

		const MockedRepository = UserRepository as unknown as jest.Mock
		const instance = MockedRepository.mock.results.at(-1)?.value as {
			create: jest.Mock
		}
		const persisted = instance.create.mock.calls[0][0] as { settings: Array<{ key: string; value: unknown }> }
		expect(persisted.settings).toEqual(
			expect.arrayContaining([
				{ key: SETTINGS_KEYS.DARK_MODE, value: true },
				{ key: SETTINGS_KEYS.LANGUAGE, value: 'en' },
			])
		)
		expect(persisted.settings).toHaveLength(2)
	})

	it('canonicaliza nickname e conflita Admin vs admin', async () => {
		const MockedRepository = UserRepository as unknown as jest.Mock
		MockedRepository.mockImplementationOnce(() => ({
			findByNickname: jest.fn(async (nickname: string) =>
				nickname === 'admin'
					? {
							id: 'existing',
							nickname: 'admin',
							email: 'admin@example.com',
							passwordHash: 'x',
							name: null,
							photoUrl: null,
							settings: [],
							acceptedTermsAt: null,
							acceptedPrivacyAt: null,
							termsVersion: null,
							privacyVersion: null,
							createdAt: new Date(),
							updatedAt: new Date(),
							deletedAt: null,
							sessionsRevokedAt: null,
						}
					: null
			),
			findByEmail: jest.fn().mockResolvedValue(null),
			create: jest.fn(),
		}))

		const useCase = new RegisterUser()
		const { ConflictError } = await import('@/errors')

		await expect(
			useCase.run({
				...validInput,
				nickname: 'Admin',
			})
		).rejects.toBeInstanceOf(ConflictError)
	})

	it('persiste nickname em forma canônica (NFC + lowercase)', async () => {
		const useCase = new RegisterUser()
		await useCase.run({
			...validInput,
			nickname: 'Cafe\u0301',
		})

		const MockedRepository = UserRepository as unknown as jest.Mock
		const instance = MockedRepository.mock.results.at(-1)?.value as {
			create: jest.Mock
			findByNickname: jest.Mock
		}
		expect(instance.findByNickname).toHaveBeenCalledWith('café')
		expect(instance.create).toHaveBeenCalledWith(
			expect.objectContaining({
				nickname: 'café',
			})
		)
	})

	it('rejeita nickname com homógrafo cirílico', async () => {
		const useCase = new RegisterUser()
		await expect(
			useCase.run({
				...validInput,
				nickname: 'аdmin',
			})
		).rejects.toBeInstanceOf(ValidationError)
	})
})
