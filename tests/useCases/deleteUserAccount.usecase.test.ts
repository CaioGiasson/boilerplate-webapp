import { hash } from 'argon2'
import DeleteUserAccount from '@/useCases/deleteUserAccount.usecase'
import * as Db from '@/managers/Db.manager'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { UnauthorizedError } from '@/errors'

const USER_ID = '507f1f77bcf86cd799439011'

const sendMail = jest.fn(async () => undefined)

jest.mock('@/services/Email/Email.service', () => ({
	getEmailService: () => ({ send: sendMail }),
}))

function activeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: USER_ID,
		name: 'Ada',
		nickname: 'ada',
		email: 'ada@example.com',
		passwordHash: null as string | null,
		photoUrl: null,
		googleLinkedAt: null as Date | null,
		settings: [],
		acceptedTermsAt: null,
		acceptedPrivacyAt: null,
		termsVersion: null,
		privacyVersion: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		sessionsRevokedAt: null,
		...overrides,
	}
}

describe('DeleteUserAccount', () => {
	beforeEach(() => {
		sendMail.mockClear()
		jest.spyOn(Db, 'getPrismaClient').mockImplementation(() => {
			throw new Error('getClient mock not configured')
		})
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('rejeita senha inválida sem alterar dados', async () => {
		const passwordHash = await hash('CorrectHorse1!')
		const userUpdate = jest.fn()

		mockPrismaRuntime({
			user: {
				findFirst: jest.fn(async () => activeUser({ passwordHash })),
				update: userUpdate,
			},
			activeSession: { deleteMany: jest.fn() },
			sessionEvent: { findFirst: jest.fn(), create: jest.fn() },
		})

		await expect(
			new DeleteUserAccount().run({
				userId: USER_ID,
				currentPassword: 'WrongPassword1!',
			})
		).rejects.toBeInstanceOf(UnauthorizedError)

		expect(userUpdate).not.toHaveBeenCalled()
		expect(sendMail).not.toHaveBeenCalled()
	})

	it('coloca conta em quarentena sem Spaces nem anonimização', async () => {
		const passwordHash = await hash('CorrectHorse1!')
		const now = new Date('2026-08-26T15:00:00.000Z')
		jest.useFakeTimers().setSystemTime(now)

		const userUpdate = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
			...activeUser({ passwordHash }),
			deletedAt: data.deletedAt,
			sessionsRevokedAt: data.sessionsRevokedAt,
		}))
		const deleteManySessions = jest.fn(async () => ({ count: 2 }))

		mockPrismaRuntime({
			user: {
				findFirst: jest.fn(async () => activeUser({ passwordHash })),
				update: userUpdate,
			},
			activeSession: { deleteMany: deleteManySessions },
			sessionEvent: {
				findFirst: jest.fn(async () => null),
				create: jest.fn(async () => ({})),
			},
		})

		const result = await new DeleteUserAccount().run({
			userId: USER_ID,
			currentPassword: 'CorrectHorse1!',
			locale: 'pt',
			session: { jti: 'jti-1', device: 'dev-1', exp: Math.floor(now.getTime() / 1000) + 3600 },
		})

		expect(result.ok).toBe(true)
		expect(result.deletedAt).toEqual(now)
		expect(userUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					deletedAt: now,
					sessionsRevokedAt: now,
				}),
			})
		)
		expect(userUpdate.mock.calls[0][0].data.email).toBeUndefined()
		expect(userUpdate.mock.calls[0][0].data.passwordHash).toBeUndefined()
		expect(deleteManySessions).toHaveBeenCalled()
		expect(sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'ada@example.com',
				subject: expect.stringContaining('quarentena'),
			})
		)

		jest.useRealTimers()
	})

	it('aceita conta só-Google sem senha', async () => {
		const userUpdate = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
			...activeUser({ passwordHash: null, googleLinkedAt: new Date() }),
			deletedAt: data.deletedAt,
			sessionsRevokedAt: data.sessionsRevokedAt,
		}))

		mockPrismaRuntime({
			user: {
				findFirst: jest.fn(async () =>
					activeUser({ passwordHash: null, googleLinkedAt: new Date('2026-01-01') })
				),
				update: userUpdate,
			},
			activeSession: { deleteMany: jest.fn(async () => ({ count: 0 })) },
			sessionEvent: { findFirst: jest.fn(), create: jest.fn() },
		})

		const result = await new DeleteUserAccount().run({
			userId: USER_ID,
			locale: 'en',
		})

		expect(result.ok).toBe(true)
		expect(userUpdate).toHaveBeenCalled()
		expect(sendMail).toHaveBeenCalled()
	})
})
