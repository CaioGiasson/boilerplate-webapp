import { randomBytes } from 'node:crypto'
import BeginTwoFactorSetup from '@/useCases/beginTwoFactorSetup.usecase'
import EnableTwoFactor from '@/useCases/enableTwoFactor.usecase'
import DisableTwoFactor from '@/useCases/disableTwoFactor.usecase'
import RegenerateRecoveryCodes from '@/useCases/regenerateRecoveryCodes.usecase'
import GetTwoFactorStatus from '@/useCases/getTwoFactorStatus.usecase'
import VerifyTwoFactorLogin from '@/useCases/verifyTwoFactorLogin.usecase'
import LoginUser from '@/useCases/loginUser.usecase'
import { ConflictError, ServiceUnavailableError, UnauthorizedError, ValidationError } from '@/errors'
import { hashPassword } from '@/utils/password'
import { hashRecoveryCode, totpCode, totpStep } from '@/utils/totp'
import { decryptSecret, encryptSecret, parseTwoFactorKey } from '@/utils/twoFactorCrypto'
import { signTwoFactorChallenge } from '@/utils/twoFactorChallenge'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

const completeLogin = jest.fn()
jest.mock('@/useCases/shared/completeLogin', () => ({
	completeLogin: (...args: unknown[]) => completeLogin(...args),
}))
jest.mock('@/managers/Log.manager', () => ({
	__esModule: true,
	default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const USER_ID = '507f1f77bcf86cd799439011'
const PASSWORD = 'Senha#12345'
const KEY_BASE64 = randomBytes(32).toString('base64')
const KEY = parseTwoFactorKey(KEY_BASE64) as Buffer
const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const originalEnv = { ...process.env }

type FakeUser = Record<string, unknown>
type FakeCode = { userId: string; codeHash: string; usedAt: Date | null }

/** Banco falso com estado: reproduz o que os use cases de 2FA dependem (campos do User, códigos de recuperação, auditoria). */
function fakeDb(userOverrides: FakeUser = {}) {
	const user: FakeUser = {
		id: USER_ID,
		name: null,
		nickname: 'ada',
		email: 'ada@example.com',
		passwordHash: null,
		photoUrl: null,
		settings: [],
		acceptedTermsAt: null,
		acceptedPrivacyAt: null,
		termsVersion: null,
		privacyVersion: null,
		createdAt: new Date('2026-08-19T00:00:00.000Z'),
		updatedAt: new Date('2026-08-19T00:00:00.000Z'),
		deletedAt: null,
		sessionsRevokedAt: null,
		role: 'USER',
		twoFactorEnabledAt: null,
		twoFactorSecretEnc: null,
		twoFactorPendingSecretEnc: null,
		twoFactorLastStep: null,
		...userOverrides,
	}
	const codes: FakeCode[] = []
	const audit: Array<Record<string, unknown>> = []

	mockPrismaRuntime({
		user: {
			findFirst: jest.fn(async () => ({ ...user })),
			update: jest.fn(async ({ data }: { data: FakeUser }) => Object.assign(user, data)),
			updateMany: jest.fn(
				async ({ where, data }: { where: { NOT: { twoFactorLastStep: { gte: number } } }; data: FakeUser }) => {
					const last = user.twoFactorLastStep as number | null
					if (last !== null && last >= where.NOT.twoFactorLastStep.gte) return { count: 0 }
					Object.assign(user, data)
					return { count: 1 }
				}
			),
		},
		twoFactorRecoveryCode: {
			deleteMany: jest.fn(async () => {
				const count = codes.length
				codes.length = 0
				return { count }
			}),
			createMany: jest.fn(async ({ data }: { data: Array<{ userId: string; codeHash: string }> }) => {
				for (const row of data) codes.push({ ...row, usedAt: null })
				return { count: data.length }
			}),
			updateMany: jest.fn(async ({ where, data }: { where: { codeHash: string }; data: { usedAt: Date } }) => {
				const found = codes.find((code) => code.codeHash === where.codeHash && code.usedAt === null)
				if (!found) return { count: 0 }
				found.usedAt = data.usedAt
				return { count: 1 }
			}),
			count: jest.fn(async () => codes.filter((code) => code.usedAt === null).length),
		},
		auditEvent: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => audit.push(data)) },
	})
	return { user, codes, audit }
}

function enabledUser(overrides: FakeUser = {}) {
	return fakeDb({
		passwordHash: 'unused',
		twoFactorEnabledAt: new Date('2026-09-01T00:00:00.000Z'),
		twoFactorSecretEnc: encryptSecret(SECRET, KEY),
		...overrides,
	})
}

const currentCode = () => totpCode(SECRET, totpStep()) as string

beforeEach(() => {
	process.env.TWO_FACTOR_ENCRYPTION_KEY = KEY_BASE64
	process.env.JWT_SECRET = 'test-jwt-secret-must-be-32-chars!'
	completeLogin.mockReset()
	completeLogin.mockResolvedValue({ kind: 'session', token: 'session-token' })
})

afterAll(() => {
	process.env = originalEnv
})

describe('GetTwoFactorStatus', () => {
	it('informa disponibilidade, estado e códigos restantes', async () => {
		const { codes } = enabledUser()
		codes.push(
			{ userId: USER_ID, codeHash: 'a', usedAt: null },
			{ userId: USER_ID, codeHash: 'b', usedAt: new Date() }
		)

		await expect(new GetTwoFactorStatus().run({ userId: USER_ID })).resolves.toEqual({
			available: true,
			enabled: true,
			recoveryCodesRemaining: 1,
		})

		delete process.env.TWO_FACTOR_ENCRYPTION_KEY
		fakeDb()
		await expect(new GetTwoFactorStatus().run({ userId: USER_ID })).resolves.toEqual({
			available: false,
			enabled: false,
			recoveryCodesRemaining: 0,
		})
	})
})

describe('BeginTwoFactorSetup', () => {
	it('gera segredo e URI e guarda o segredo cifrado como pendente (nunca em claro)', async () => {
		const { user } = fakeDb({ passwordHash: 'hash' })

		const result = await new BeginTwoFactorSetup().run({ userId: USER_ID })

		expect(result.secret).toMatch(/^[A-Z2-7]{32}$/)
		expect(result.otpauthUri).toContain(`secret=${result.secret}`)
		expect(result.otpauthUri).toContain('ada%40example.com')
		expect(user.twoFactorPendingSecretEnc).not.toContain(result.secret)
		expect(decryptSecret(user.twoFactorPendingSecretEnc as string, KEY)).toBe(result.secret)
		expect(user.twoFactorEnabledAt).toBeNull()
	})

	it('recusa sem a chave (503), sem senha (400) e quando já está ativo (409)', async () => {
		delete process.env.TWO_FACTOR_ENCRYPTION_KEY
		fakeDb({ passwordHash: 'hash' })
		await expect(new BeginTwoFactorSetup().run({ userId: USER_ID })).rejects.toBeInstanceOf(ServiceUnavailableError)

		process.env.TWO_FACTOR_ENCRYPTION_KEY = KEY_BASE64
		fakeDb({ passwordHash: null })
		await expect(new BeginTwoFactorSetup().run({ userId: USER_ID })).rejects.toMatchObject({
			code: 'PASSWORD_REQUIRED',
		})

		enabledUser()
		await expect(new BeginTwoFactorSetup().run({ userId: USER_ID })).rejects.toBeInstanceOf(ConflictError)
	})
})

describe('EnableTwoFactor', () => {
	it('com o código certo ativa, guarda só hashes dos códigos de recuperação e audita', async () => {
		const { user, codes, audit } = fakeDb({
			passwordHash: 'hash',
			twoFactorPendingSecretEnc: encryptSecret(SECRET, KEY),
		})

		const { recoveryCodes } = await new EnableTwoFactor().run({ userId: USER_ID, code: currentCode() })

		expect(user.twoFactorEnabledAt).toBeInstanceOf(Date)
		expect(user.twoFactorPendingSecretEnc).toBeNull()
		expect(decryptSecret(user.twoFactorSecretEnc as string, KEY)).toBe(SECRET)
		expect(recoveryCodes).toHaveLength(10)
		expect(codes.map((code) => code.codeHash).sort()).toEqual(recoveryCodes.map(hashRecoveryCode).sort())
		expect(JSON.stringify(codes)).not.toContain(recoveryCodes[0])
		expect(audit).toEqual([expect.objectContaining({ action: 'user.two_factor_enabled', actorId: USER_ID })])
	})

	it('código errado, setup não iniciado e já ativo são recusados sem ativar', async () => {
		const { user } = fakeDb({ passwordHash: 'hash', twoFactorPendingSecretEnc: encryptSecret(SECRET, KEY) })
		await expect(new EnableTwoFactor().run({ userId: USER_ID, code: '000000' })).rejects.toMatchObject({
			code: 'INVALID_TWO_FACTOR_CODE',
		})
		expect(user.twoFactorEnabledAt).toBeNull()

		fakeDb({ passwordHash: 'hash' })
		await expect(new EnableTwoFactor().run({ userId: USER_ID, code: '123456' })).rejects.toMatchObject({
			code: 'SETUP_REQUIRED',
		})

		enabledUser()
		await expect(new EnableTwoFactor().run({ userId: USER_ID, code: currentCode() })).rejects.toBeInstanceOf(
			ConflictError
		)
	})
})

describe('DisableTwoFactor', () => {
	let passwordHash: string

	beforeAll(async () => {
		passwordHash = await hashPassword(PASSWORD)
	})

	it('com senha e código desativa, apaga os códigos de recuperação e audita', async () => {
		const { user, codes, audit } = enabledUser({ passwordHash })
		codes.push({ userId: USER_ID, codeHash: 'x', usedAt: null })

		await expect(
			new DisableTwoFactor().run({ userId: USER_ID, password: PASSWORD, code: currentCode() })
		).resolves.toEqual({ ok: true })

		expect(user.twoFactorEnabledAt).toBeNull()
		expect(user.twoFactorSecretEnc).toBeNull()
		expect(codes).toHaveLength(0)
		expect(audit).toEqual([expect.objectContaining({ action: 'user.two_factor_disabled' })])
	})

	it('aceita um código de recuperação no lugar do TOTP', async () => {
		const { codes } = enabledUser({ passwordHash })
		codes.push({ userId: USER_ID, codeHash: hashRecoveryCode('ABCDE-FGHIJ'), usedAt: null })

		await expect(
			new DisableTwoFactor().run({ userId: USER_ID, password: PASSWORD, recoveryCode: 'abcde fghij' })
		).resolves.toEqual({ ok: true })
	})

	it('senha errada ou código errado não desativam; sem segundo fator é 400', async () => {
		const { user } = enabledUser({ passwordHash })

		await expect(
			new DisableTwoFactor().run({ userId: USER_ID, password: 'errada', code: currentCode() })
		).rejects.toBeInstanceOf(UnauthorizedError)
		await expect(
			new DisableTwoFactor().run({ userId: USER_ID, password: PASSWORD, code: '000000' })
		).rejects.toBeInstanceOf(UnauthorizedError)
		await expect(new DisableTwoFactor().run({ userId: USER_ID, password: PASSWORD })).rejects.toBeInstanceOf(
			ValidationError
		)
		await expect(
			new DisableTwoFactor().run({
				userId: USER_ID,
				password: PASSWORD,
				code: currentCode(),
				recoveryCode: 'ABCDE-FGHIJ',
			})
		).rejects.toBeInstanceOf(ValidationError)
		expect(user.twoFactorEnabledAt).not.toBeNull()
	})

	it('o mesmo código não vale duas vezes (replay)', async () => {
		const { user } = enabledUser({ passwordHash, twoFactorLastStep: totpStep() })

		await expect(
			new DisableTwoFactor().run({ userId: USER_ID, password: PASSWORD, code: currentCode() })
		).rejects.toBeInstanceOf(UnauthorizedError)
		expect(user.twoFactorEnabledAt).not.toBeNull()
	})
})

describe('RegenerateRecoveryCodes', () => {
	it('com o código do app troca todos os códigos e audita; um código de recuperação não serve', async () => {
		const { codes, audit } = enabledUser()
		codes.push({ userId: USER_ID, codeHash: 'velho', usedAt: null })

		const { recoveryCodes } = await new RegenerateRecoveryCodes().run({ userId: USER_ID, code: currentCode() })

		expect(recoveryCodes).toHaveLength(10)
		expect(codes.some((code) => code.codeHash === 'velho')).toBe(false)
		expect(audit).toEqual([expect.objectContaining({ action: 'user.two_factor_recovery_regenerated' })])

		await expect(
			new RegenerateRecoveryCodes().run({ userId: USER_ID, code: 'ABCDE-FGHIJ' })
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('exige 2FA ativo', async () => {
		fakeDb()

		await expect(new RegenerateRecoveryCodes().run({ userId: USER_ID, code: '123456' })).rejects.toMatchObject({
			code: 'TWO_FACTOR_NOT_ENABLED',
		})
	})
})

describe('VerifyTwoFactorLogin', () => {
	const run = async (input: { code?: string; recoveryCode?: string; challengeToken?: string }) =>
		new VerifyTwoFactorLogin({ send: jest.fn() } as never).run({
			challengeToken: input.challengeToken ?? (await signTwoFactorChallenge(USER_ID)),
			code: input.code,
			recoveryCode: input.recoveryCode,
			deviceCookie: null,
		})

	it('código certo abre a sessão; o mesmo código de novo é recusado', async () => {
		enabledUser()

		await expect(run({ code: currentCode() })).resolves.toEqual({ kind: 'session', token: 'session-token' })
		expect(completeLogin).toHaveBeenCalledTimes(1)

		await expect(run({ code: currentCode() })).rejects.toBeInstanceOf(UnauthorizedError)
		expect(completeLogin).toHaveBeenCalledTimes(1)
	})

	it('código errado não abre sessão', async () => {
		enabledUser()

		await expect(run({ code: '000000' })).rejects.toBeInstanceOf(UnauthorizedError)
		expect(completeLogin).not.toHaveBeenCalled()
	})

	it('código de recuperação vale uma vez, audita o uso e informa quantos restam', async () => {
		const { codes, audit } = enabledUser()
		codes.push(
			{ userId: USER_ID, codeHash: hashRecoveryCode('ABCDE-FGHIJ'), usedAt: null },
			{ userId: USER_ID, codeHash: hashRecoveryCode('KLMNO-PQRST'), usedAt: null }
		)

		await expect(run({ recoveryCode: 'abcde-fghij' })).resolves.toMatchObject({ kind: 'session' })
		expect(audit).toEqual([
			expect.objectContaining({ action: 'user.two_factor_recovery_used', metadata: { remaining: 1 } }),
		])

		await expect(run({ recoveryCode: 'ABCDE-FGHIJ' })).rejects.toBeInstanceOf(UnauthorizedError)
		expect(completeLogin).toHaveBeenCalledTimes(1)
	})

	it('desafio inválido, adulterado ou de conta sem 2FA responde 401 sem abrir sessão', async () => {
		enabledUser()
		await expect(run({ code: currentCode(), challengeToken: 'lixo' })).rejects.toBeInstanceOf(UnauthorizedError)

		fakeDb({ passwordHash: 'hash' })
		await expect(run({ code: currentCode() })).rejects.toBeInstanceOf(UnauthorizedError)
		expect(completeLogin).not.toHaveBeenCalled()
	})

	it('sem a chave de cifra falha fechado (503) e não abre sessão', async () => {
		enabledUser()
		delete process.env.TWO_FACTOR_ENCRYPTION_KEY

		await expect(run({ code: currentCode() })).rejects.toBeInstanceOf(ServiceUnavailableError)
		expect(completeLogin).not.toHaveBeenCalled()
	})

	it('exige código ou recuperação, não os dois nem nenhum', async () => {
		enabledUser()

		await expect(run({})).rejects.toBeInstanceOf(ValidationError)
		await expect(run({ code: currentCode(), recoveryCode: 'ABCDE-FGHIJ' })).rejects.toBeInstanceOf(ValidationError)
	})
})

describe('LoginUser com 2FA', () => {
	let passwordHash: string

	beforeAll(async () => {
		passwordHash = await hashPassword(PASSWORD)
	})

	const login = () =>
		new LoginUser({ send: jest.fn() } as never).run({ identifier: 'ada@example.com', password: PASSWORD })

	it('senha certa em conta com 2FA devolve o desafio e NÃO abre sessão', async () => {
		enabledUser({ passwordHash })

		const result = await login()

		expect(result).toMatchObject({ kind: 'two_factor_required' })
		expect(typeof (result as { challengeToken: string }).challengeToken).toBe('string')
		expect(completeLogin).not.toHaveBeenCalled()
	})

	it('conta sem 2FA segue direto para a sessão', async () => {
		fakeDb({ passwordHash })

		await expect(login()).resolves.toEqual({ kind: 'session', token: 'session-token' })
	})

	it('conta com 2FA e servidor sem a chave: falha fechada (503), sem sessão e sem desafio', async () => {
		enabledUser({ passwordHash })
		delete process.env.TWO_FACTOR_ENCRYPTION_KEY

		await expect(login()).rejects.toBeInstanceOf(ServiceUnavailableError)
		expect(completeLogin).not.toHaveBeenCalled()
	})

	it('senha errada continua sendo 401 e não revela se há 2FA', async () => {
		enabledUser({ passwordHash })

		await expect(
			new LoginUser({ send: jest.fn() } as never).run({ identifier: 'ada@example.com', password: 'errada' })
		).rejects.toBeInstanceOf(UnauthorizedError)
	})
})
