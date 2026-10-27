import AuditEventRepository from '@/repositories/AuditEvent.repository'
import { runWithRequestContext } from '@/lib/requestContext'
import LogManager from '@/managers/Log.manager'

jest.mock('@/managers/Log.manager', () => ({
	__esModule: true,
	default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const USER_ID = '507f1f77bcf86cd799439011'
const ADMIN_ID = '507f1f77bcf86cd799439012'

function repositoryWith(auditEvent: Record<string, unknown>) {
	return new AuditEventRepository({ auditEvent } as never)
}

describe('AuditEventRepository.record', () => {
	it('grava o evento com o requestId e o IP da requisição em curso', async () => {
		const create = jest.fn(async () => ({}))

		await runWithRequestContext(
			'req-12345678',
			() =>
				repositoryWith({ create }).record({
					action: 'admin.impersonation_token_created',
					actorType: 'admin',
					actorId: ADMIN_ID,
					targetUserId: USER_ID,
					metadata: { ttlSeconds: 600 },
				}),
			{ ip: '203.0.113.7' }
		)

		expect(create).toHaveBeenCalledWith({
			data: {
				action: 'admin.impersonation_token_created',
				actorType: 'admin',
				actorId: ADMIN_ID,
				targetUserId: USER_ID,
				metadata: { ttlSeconds: 600 },
				ip: '203.0.113.7',
				requestId: 'req-12345678',
			},
		})
	})

	it('fora de uma requisição (scripts, jobs) grava sem IP e sem requestId', async () => {
		const create = jest.fn(async () => ({}))

		await repositoryWith({ create }).record({ action: 'operator.role_changed', actorType: 'operator' })

		expect(create).toHaveBeenCalledWith({
			data: {
				action: 'operator.role_changed',
				actorType: 'operator',
				actorId: null,
				targetUserId: null,
				metadata: undefined,
				ip: null,
				requestId: null,
			},
		})
	})

	it('nunca lança: falha do banco (ou delegate ausente) vira log de erro', async () => {
		const failing = repositoryWith({ create: jest.fn(async () => Promise.reject(new Error('db down'))) })
		const missing = new AuditEventRepository({} as never)

		await expect(failing.record({ action: 'user.password_changed', actorType: 'user' })).resolves.toBeUndefined()
		await expect(missing.record({ action: 'user.password_changed', actorType: 'user' })).resolves.toBeUndefined()
		expect(LogManager.error).toHaveBeenCalledTimes(2)
	})
})

describe('AuditEventRepository consultas', () => {
	it('listPage ordena por keyset e filtra por ação', async () => {
		const findMany = jest.fn(async () => [])

		await repositoryWith({ findMany }).listPage({ limit: 21, order: 'desc', action: 'user.password_changed' })

		expect(findMany).toHaveBeenCalledWith({
			where: { action: 'user.password_changed' },
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: 21,
		})
	})

	it('listByUser traz o que o usuário fez e o que foi feito com ele', async () => {
		const findMany = jest.fn(async () => [])

		await repositoryWith({ findMany }).listByUser(USER_ID)

		expect(findMany).toHaveBeenCalledWith({
			where: { OR: [{ actorId: USER_ID }, { targetUserId: USER_ID }] },
			orderBy: { createdAt: 'desc' },
		})
	})

	it('não expõe update nem delete: a trilha é append-only', () => {
		const repository = new AuditEventRepository({} as never) as unknown as Record<string, unknown>

		expect(repository.update).toBeUndefined()
		expect(repository.delete).toBeUndefined()
	})
})
