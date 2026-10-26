import ListAdminUsers, { ADMIN_USERS_PAGE_SIZE } from '@/useCases/listAdminUsers.usecase'
import { ForbiddenError, ValidationError } from '@/errors'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

type Row = Record<string, unknown>

function userRow(overrides: Row): Row {
	return {
		id: 'user-1',
		name: null,
		nickname: 'alice',
		email: 'alice@example.com',
		passwordHash: 'hash',
		photoUrl: null,
		settings: [],
		acceptedTermsAt: null,
		acceptedPrivacyAt: null,
		termsVersion: null,
		privacyVersion: null,
		emailVerifiedAt: null,
		createdAt: new Date('2026-08-19T00:00:00.000Z'),
		updatedAt: new Date('2026-08-19T00:00:00.000Z'),
		deletedAt: null,
		sessionsRevokedAt: null,
		role: 'USER',
		...overrides,
	}
}

function mockDb(caller: Row | null, rows: Row[], total: number) {
	const findMany = jest.fn(async () => rows)
	mockPrismaRuntime({
		user: {
			findFirst: jest.fn(async () => caller),
			findMany,
			count: jest.fn(async () => total),
		},
	})
	return { findMany }
}

describe('ListAdminUsers', () => {
	it('lista usuários ativos com e-mail mascarado, sem campos sensíveis', async () => {
		const { findMany } = mockDb(
			userRow({ id: 'admin-1', role: 'ADMIN' }),
			[userRow({ id: 'u1', email: 'bob@example.com', nickname: 'bob', emailVerifiedAt: new Date() })],
			1
		)

		const result = await new ListAdminUsers().run({ callerId: 'admin-1' })

		expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: ADMIN_USERS_PAGE_SIZE }))
		expect(result.items).toEqual([
			{
				id: 'u1',
				nickname: 'bob',
				emailMasked: 'b***@e***.com',
				role: 'USER',
				emailVerified: true,
				createdAt: '2026-08-19T00:00:00.000Z',
			},
		])
		expect(JSON.stringify(result)).not.toContain('bob@example.com')
		expect(JSON.stringify(result)).not.toContain('passwordHash')
		expect(result).toMatchObject({ page: 1, pageSize: ADMIN_USERS_PAGE_SIZE, total: 1, hasMore: false })
	})

	it('pagina com skip e informa hasMore', async () => {
		const { findMany } = mockDb(userRow({ id: 'admin-1', role: 'ADMIN' }), [], ADMIN_USERS_PAGE_SIZE * 3)

		const result = await new ListAdminUsers().run({ callerId: 'admin-1', page: 2 })

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ skip: ADMIN_USERS_PAGE_SIZE, take: ADMIN_USERS_PAGE_SIZE })
		)
		expect(result.hasMore).toBe(true)
	})

	it('recusa quem não é admin e chamador inexistente', async () => {
		mockDb(userRow({ id: 'user-1' }), [], 0)
		await expect(new ListAdminUsers().run({ callerId: 'user-1' })).rejects.toBeInstanceOf(ForbiddenError)

		mockDb(null, [], 0)
		await expect(new ListAdminUsers().run({ callerId: 'ghost' })).rejects.toBeInstanceOf(ForbiddenError)
	})

	it.each([0, -1, 1.5, Number.NaN])('recusa page inválida (%p)', async (page) => {
		mockDb(userRow({ id: 'admin-1', role: 'ADMIN' }), [], 0)

		await expect(new ListAdminUsers().run({ callerId: 'admin-1', page })).rejects.toBeInstanceOf(ValidationError)
	})
})
