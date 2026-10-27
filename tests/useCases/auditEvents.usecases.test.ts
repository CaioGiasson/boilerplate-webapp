import ListAuditEvents from '@/useCases/listAuditEvents.usecase'
import RevokeOtherUserSessions from '@/useCases/revokeOtherUserSessions.usecase'
import CreateImpersonationToken from '@/useCases/createImpersonationToken.usecase'
import { ForbiddenError, ValidationError } from '@/errors'
import { PAGE_DEFAULT_LIMIT, PAGE_MAX_LIMIT, decodeKeysetCursor } from '@/utils/pagination'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

const ADMIN_ID = '507f1f77bcf86cd799439011'
const USER_ID = '507f1f77bcf86cd799439012'
const GONE_ID = '507f1f77bcf86cd799439013'
const NEWER = new Date('2026-10-26T12:00:00.000Z')
const OLDER = new Date('2026-10-25T12:00:00.000Z')

function userRow(id: string, role: string, nickname = 'alice') {
	return {
		id,
		name: null,
		nickname,
		email: `${nickname}@example.com`,
		passwordHash: 'hash',
		photoUrl: null,
		settings: [],
		createdAt: NEWER,
		updatedAt: NEWER,
		deletedAt: null,
		sessionsRevokedAt: null,
		role,
	}
}

function eventRow(overrides: Record<string, unknown> = {}) {
	return {
		id: '607f1f77bcf86cd799439021',
		action: 'user.password_changed',
		actorType: 'user',
		actorId: USER_ID,
		targetUserId: USER_ID,
		metadata: { secret: 'não sai' },
		ip: '203.0.113.7',
		requestId: 'req-12345678',
		createdAt: NEWER,
		...overrides,
	}
}

function mockAdminDb(events: unknown[], nicknameRows: unknown[] = []) {
	const auditFindMany = jest.fn(async () => events)
	const userFindMany = jest.fn(async () => nicknameRows)
	mockPrismaRuntime({
		user: { findFirst: jest.fn(async () => userRow(ADMIN_ID, 'ADMIN', 'root')), findMany: userFindMany },
		auditEvent: { findMany: auditFindMany },
	})
	return { auditFindMany, userFindMany }
}

describe('ListAuditEvents', () => {
	it('lista com apelidos de quem agiu e do alvo, sem IP, requestId nem metadata', async () => {
		mockAdminDb(
			[
				eventRow({ actorId: ADMIN_ID, actorType: 'admin' }),
				eventRow({ actorId: null, targetUserId: GONE_ID, actorType: 'operator' }),
			],
			[
				{ id: ADMIN_ID, nickname: 'root' },
				{ id: USER_ID, nickname: 'alice' },
			]
		)

		const result = await new ListAuditEvents().run({ callerId: ADMIN_ID })

		expect(result.items).toEqual([
			{
				id: '607f1f77bcf86cd799439021',
				action: 'user.password_changed',
				actorType: 'admin',
				actor: { id: ADMIN_ID, nickname: 'root' },
				target: { id: USER_ID, nickname: 'alice' },
				createdAt: '2026-10-26T12:00:00.000Z',
			},
			{
				id: '607f1f77bcf86cd799439021',
				action: 'user.password_changed',
				actorType: 'operator',
				actor: null,
				target: { id: GONE_ID, nickname: null },
				createdAt: '2026-10-26T12:00:00.000Z',
			},
		])
		const serialized = JSON.stringify(result)
		for (const leaked of ['203.0.113.7', 'req-12345678', 'não sai']) expect(serialized).not.toContain(leaked)
	})

	it('pagina por cursor, repassa a ação e busca os apelidos uma vez só', async () => {
		const { auditFindMany, userFindMany } = mockAdminDb([
			eventRow({ id: '607f1f77bcf86cd799439031', createdAt: NEWER }),
			eventRow({ id: '607f1f77bcf86cd799439032', createdAt: OLDER }),
		])

		const result = await new ListAuditEvents().run({
			callerId: ADMIN_ID,
			limit: 1,
			action: 'user.password_changed',
		})

		expect(auditFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { action: 'user.password_changed' },
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				take: 2,
			})
		)
		expect(result.items).toHaveLength(1)
		expect(result.pageInfo.hasNext).toBe(true)
		expect(decodeKeysetCursor(result.pageInfo.nextCursor as string)).toEqual({
			createdAt: NEWER,
			id: '607f1f77bcf86cd799439031',
		})
		expect(userFindMany).toHaveBeenCalledTimes(1)
	})

	it('usa o limite padrão e recusa limite inválido', async () => {
		const { auditFindMany } = mockAdminDb([])

		await new ListAuditEvents().run({ callerId: ADMIN_ID })
		expect(auditFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: PAGE_DEFAULT_LIMIT + 1 }))
		await expect(
			new ListAuditEvents().run({ callerId: ADMIN_ID, limit: PAGE_MAX_LIMIT + 1 })
		).rejects.toBeInstanceOf(ValidationError)
	})

	it('só ADMIN: usuário comum e chamador inexistente levam 403 sem tocar na trilha', async () => {
		const auditFindMany = jest.fn()
		mockPrismaRuntime({
			user: { findFirst: jest.fn(async () => userRow(USER_ID, 'USER')) },
			auditEvent: { findMany: auditFindMany },
		})
		await expect(new ListAuditEvents().run({ callerId: USER_ID })).rejects.toBeInstanceOf(ForbiddenError)

		mockPrismaRuntime({ user: { findFirst: jest.fn(async () => null) }, auditEvent: { findMany: auditFindMany } })
		await expect(new ListAuditEvents().run({ callerId: 'ghost' })).rejects.toBeInstanceOf(ForbiddenError)
		expect(auditFindMany).not.toHaveBeenCalled()
	})
})

describe('use cases registram auditoria', () => {
	it('RevokeOtherUserSessions registra quantas sessões foram derrubadas', async () => {
		const create = jest.fn(async () => ({}))
		mockPrismaRuntime({
			activeSession: {
				findMany: jest.fn(async () => []),
				deleteMany: jest.fn(async () => ({ count: 0 })),
			},
			sessionEvent: { create: jest.fn(), createMany: jest.fn() },
			auditEvent: { create },
		})

		await new RevokeOtherUserSessions().run({ userId: USER_ID, currentJti: 'jti-atual' })

		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				action: 'user.sessions_revoked_others',
				actorType: 'user',
				actorId: USER_ID,
				targetUserId: USER_ID,
				metadata: { revokedCount: 0 },
			}),
		})
	})

	describe('CreateImpersonationToken', () => {
		const originalSecret = process.env.JWT_SECRET

		beforeEach(() => {
			process.env.JWT_SECRET = 'test-jwt-secret-must-be-32-chars!'
		})

		afterEach(() => {
			if (originalSecret === undefined) delete process.env.JWT_SECRET
			else process.env.JWT_SECRET = originalSecret
		})

		it('registra quem emitiu o link e para quem, sem o token', async () => {
			const create = jest.fn(async () => ({}))
			const findFirst = jest.fn(async (args: { where: { AND: Array<{ id?: string }> } }) =>
				args.where.AND[0]?.id === ADMIN_ID ? userRow(ADMIN_ID, 'ADMIN', 'root') : userRow(USER_ID, 'USER')
			)
			mockPrismaRuntime({ user: { findFirst }, auditEvent: { create } })

			const result = await new CreateImpersonationToken().run({ callerId: ADMIN_ID, targetUserId: USER_ID })

			const data = (create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data
			expect(data).toMatchObject({
				action: 'admin.impersonation_token_created',
				actorType: 'admin',
				actorId: ADMIN_ID,
				targetUserId: USER_ID,
				metadata: { ttlSeconds: 600 },
			})
			expect(JSON.stringify(data)).not.toContain(result.token)
		})
	})
})
