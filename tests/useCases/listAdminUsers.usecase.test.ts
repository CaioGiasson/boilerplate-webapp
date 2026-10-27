import ListAdminUsers from '@/useCases/listAdminUsers.usecase'
import { ForbiddenError, ValidationError } from '@/errors'
import { PAGE_DEFAULT_LIMIT, PAGE_MAX_LIMIT, decodeKeysetCursor } from '@/utils/pagination'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

type Row = Record<string, unknown>

function userRow(overrides: Row): Row {
	return {
		id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
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

const ADMIN = userRow({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', role: 'ADMIN' })

function mockDb(caller: Row | null, rows: Row[]) {
	const findMany = jest.fn(async () => rows)
	mockPrismaRuntime({
		user: {
			findFirst: jest.fn(async () => caller),
			findMany,
		},
	})
	return { findMany }
}

describe('ListAdminUsers', () => {
	it('lista usuários ativos com e-mail mascarado, sem campos sensíveis', async () => {
		const { findMany } = mockDb(ADMIN, [
			userRow({
				id: 'cccccccccccccccccccccccc',
				email: 'bob@example.com',
				nickname: 'bob',
				emailVerifiedAt: new Date(),
			}),
		])

		const result = await new ListAdminUsers().run({ callerId: ADMIN.id as string })

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				take: PAGE_DEFAULT_LIMIT + 1,
			})
		)
		expect(result.items).toEqual([
			{
				id: 'cccccccccccccccccccccccc',
				nickname: 'bob',
				emailMasked: 'b***@e***.com',
				role: 'USER',
				emailVerified: true,
				createdAt: '2026-08-19T00:00:00.000Z',
			},
		])
		expect(JSON.stringify(result)).not.toContain('bob@example.com')
		expect(JSON.stringify(result)).not.toContain('passwordHash')
		expect(result.pageInfo).toEqual({ nextCursor: null, hasNext: false, limit: PAGE_DEFAULT_LIMIT })
	})

	it('busca uma linha a mais para saber se há próxima página e devolve o cursor da última mantida', async () => {
		const rows = ['1', '2', '3'].map((n) =>
			userRow({ id: n.repeat(24), nickname: `u${n}`, createdAt: new Date(`2026-08-1${n}T00:00:00.000Z`) })
		)
		mockDb(ADMIN, rows)

		const result = await new ListAdminUsers().run({ callerId: ADMIN.id as string, limit: 2 })

		expect(result.items.map((item) => item.nickname)).toEqual(['u1', 'u2'])
		expect(result.pageInfo.hasNext).toBe(true)
		expect(decodeKeysetCursor(result.pageInfo.nextCursor as string)).toEqual({
			createdAt: new Date('2026-08-12T00:00:00.000Z'),
			id: '2'.repeat(24),
		})
	})

	it('repassa cursor, ordem e busca ao banco (busca só por nickname)', async () => {
		const { findMany } = mockDb(ADMIN, [])
		const cursor = { createdAt: new Date('2026-08-12T00:00:00.000Z'), id: '2'.repeat(24) }

		await new ListAdminUsers().run({ callerId: ADMIN.id as string, cursor, order: 'asc', q: 'ali' })

		const args = (findMany.mock.calls[0] as unknown as [Record<string, unknown>])[0]
		expect(args.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }])
		const where = JSON.stringify(args.where)
		expect(where).toContain('"nickname":{"contains":"ali","mode":"insensitive"}')
		expect(where).not.toContain('email')
		expect(where).toContain('"gt"')
	})

	it('recusa quem não é admin e chamador inexistente', async () => {
		mockDb(userRow({}), [])
		await expect(new ListAdminUsers().run({ callerId: 'aaaaaaaaaaaaaaaaaaaaaaaa' })).rejects.toBeInstanceOf(
			ForbiddenError
		)

		mockDb(null, [])
		await expect(new ListAdminUsers().run({ callerId: 'ghost' })).rejects.toBeInstanceOf(ForbiddenError)
	})

	it.each([0, -1, 1.5, Number.NaN, PAGE_MAX_LIMIT + 1])('recusa limit inválido (%p)', async (limit) => {
		mockDb(ADMIN, [])

		await expect(new ListAdminUsers().run({ callerId: ADMIN.id as string, limit })).rejects.toBeInstanceOf(
			ValidationError
		)
	})
})
