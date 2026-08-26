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
	}
})

jest.mock('@/repositories/ActiveSession.repository', () => {
	return jest.fn().mockImplementation(() => ({
		create: jest.fn().mockResolvedValue({ id: 'session-1' }),
	}))
})

jest.mock('@/utils/password', () => {
	const actual = jest.requireActual<typeof import('@/utils/password')>('@/utils/password')
	return {
		...actual,
		verifyPassword: jest.fn(),
		verifyPasswordOrDummy: jest.fn(),
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

import LoginUser from '@/useCases/loginUser.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { ValidationError } from '@/errors'
import { verifyPasswordOrDummy } from '@/utils/password'
import { signSessionToken } from '@/utils/session'
import UserRepository from '@/repositories/User.repository'
import EmailService from '@/services/Email/Email.service'
import LogManager from '@/managers/Log.manager'
import { buildUser } from '../factories'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KNOWN_DEVICE = '11111111-1111-4111-8111-111111111111'

const baseUser = buildUser()

describe('LoginUser', () => {
	mockPrismaRuntime({})

	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(verifyPasswordOrDummy).mockResolvedValue(true)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByNicknameIncludingDeleted: jest.fn().mockResolvedValue({ ...baseUser }),
			findByEmailIncludingDeleted: jest.fn(),
			updateLastLoginDevice: jest.fn().mockResolvedValue(undefined),
		}))
	})

	it('rejeita senha acima de 128 caracteres sem Argon2', async () => {
		const useCase = new LoginUser()

		await expect(
			useCase.run({
				identifier: 'alice',
				password: `${'A'.repeat(200)}b1!`,
			})
		).rejects.toBeInstanceOf(ValidationError)
		expect(verifyPasswordOrDummy).not.toHaveBeenCalled()
	})

	it('reusa deviceCookie válido e ignora device forjado no body (campo ausente)', async () => {
		const useCase = new LoginUser()

		const result = await useCase.run({
			identifier: 'alice',
			password: 'Abcdef12',
			deviceCookie: KNOWN_DEVICE,
		})

		expect(signSessionToken).toHaveBeenCalledTimes(1)
		const claims = jest.mocked(signSessionToken).mock.calls[0][0]
		expect(claims.userId).toBe('user-1')
		expect(claims.device).toBe(KNOWN_DEVICE)
		expect(result.device).toBe(KNOWN_DEVICE)
	})

	it('emite novo device quando o cookie é inválido', async () => {
		const useCase = new LoginUser()

		const result = await useCase.run({
			identifier: 'alice',
			password: 'Abcdef12',
			deviceCookie: 'forged-device',
		})

		expect(result.device).toMatch(UUID_PATTERN)
		expect(result.device).not.toBe('forged-device')
	})

	it('login por nick passa o identifier ao findByNicknameIncludingDeleted (repo canoniciza)', async () => {
		const findByNicknameIncludingDeleted = jest.fn().mockResolvedValue({ ...baseUser })
		const updateLastLoginDevice = jest.fn().mockResolvedValue(undefined)
		;(UserRepository as unknown as jest.Mock).mockImplementationOnce(() => ({
			findByNicknameIncludingDeleted,
			findByEmailIncludingDeleted: jest.fn(),
			updateLastLoginDevice,
		}))

		const useCase = new LoginUser()
		await useCase.run({
			identifier: 'ALICE',
			password: 'Abcdef12',
		})

		expect(findByNicknameIncludingDeleted).toHaveBeenCalledWith('ALICE')
		expect(verifyPasswordOrDummy).toHaveBeenCalled()
	})

	it('envia e-mail de novo login quando a conta está verificada e o device é novo', async () => {
		const updateLastLoginDevice = jest.fn().mockResolvedValue(undefined)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByNicknameIncludingDeleted: jest.fn().mockResolvedValue({
				...baseUser,
				emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
				lastLoginDevice: null,
			}),
			findByEmailIncludingDeleted: jest.fn(),
			updateLastLoginDevice,
		}))

		const emailService = new EmailService()
		const useCase = new LoginUser(emailService)
		await useCase.run({ identifier: 'alice', password: 'Abcdef12' })

		expect(emailService.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'alice@example.com',
				subject: 'New login to your Vitraux account',
				text: expect.stringContaining('Someone just signed in'),
			})
		)
		expect(updateLastLoginDevice).toHaveBeenCalledWith('user-1', expect.stringMatching(UUID_PATTERN))
	})

	it('não envia e-mail de novo login se a conta não está verificada', async () => {
		const updateLastLoginDevice = jest.fn().mockResolvedValue(undefined)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByNicknameIncludingDeleted: jest.fn().mockResolvedValue({
				...baseUser,
				emailVerifiedAt: null,
				lastLoginDevice: null,
			}),
			findByEmailIncludingDeleted: jest.fn(),
			updateLastLoginDevice,
		}))

		const emailService = new EmailService()
		const useCase = new LoginUser(emailService)
		await useCase.run({ identifier: 'alice', password: 'Abcdef12' })

		expect(emailService.send).not.toHaveBeenCalled()
		expect(updateLastLoginDevice).toHaveBeenCalled()
	})

	it('não envia e-mail quando o deviceCookie coincide com lastLoginDevice', async () => {
		const updateLastLoginDevice = jest.fn().mockResolvedValue(undefined)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByNicknameIncludingDeleted: jest.fn().mockResolvedValue({
				...baseUser,
				emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
				lastLoginDevice: KNOWN_DEVICE,
			}),
			findByEmailIncludingDeleted: jest.fn(),
			updateLastLoginDevice,
		}))

		const emailService = new EmailService()
		const useCase = new LoginUser(emailService)
		await useCase.run({
			identifier: 'alice',
			password: 'Abcdef12',
			deviceCookie: KNOWN_DEVICE,
		})

		expect(emailService.send).not.toHaveBeenCalled()
		expect(updateLastLoginDevice).toHaveBeenCalledWith('user-1', KNOWN_DEVICE)
	})

	it('não propaga falha de envio do e-mail de novo login', async () => {
		const updateLastLoginDevice = jest.fn().mockResolvedValue(undefined)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByNicknameIncludingDeleted: jest.fn().mockResolvedValue({
				...baseUser,
				emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
			}),
			findByEmailIncludingDeleted: jest.fn(),
			updateLastLoginDevice,
		}))

		const emailService = new EmailService()
		jest.mocked(emailService.send).mockRejectedValueOnce(new Error('smtp down'))
		const logSpy = jest.spyOn(LogManager, 'error').mockImplementation(() => undefined)

		const useCase = new LoginUser(emailService)
		const result = await useCase.run({ identifier: 'alice', password: 'Abcdef12' })

		expect(result.token).toBe('token')
		expect(logSpy).toHaveBeenCalledWith('Failed to send new-login email', expect.any(Error))
		expect(updateLastLoginDevice).toHaveBeenCalled()
		logSpy.mockRestore()
	})

	it('pede login Google quando a conta não tem senha e está vinculada', async () => {
		jest.mocked(verifyPasswordOrDummy).mockResolvedValue(false)
		;(UserRepository as unknown as jest.Mock).mockImplementation(() => ({
			findByNicknameIncludingDeleted: jest
				.fn()
				.mockResolvedValue(
					buildUser({ passwordHash: null, googleLinkedAt: new Date('2026-08-26T00:00:00.000Z') })
				),
			findByEmailIncludingDeleted: jest.fn(),
		}))

		await expect(new LoginUser().run({ identifier: 'alice', password: 'anything' })).rejects.toMatchObject({
			code: 'GOOGLE_LOGIN_REQUIRED',
		})
	})
})
