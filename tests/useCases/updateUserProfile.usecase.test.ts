jest.mock('@/utils/publicUserAccess', () => ({
	toPublicUserWithSignedPhoto: jest.fn(
		async (user: {
			id: string
			name: string | null
			nickname: string
			email: string
			photoUrl: string | null
			settings: unknown[]
		}) => ({
			id: user.id,
			name: user.name,
			nickname: user.nickname,
			email: user.email,
			photoUrl: user.photoUrl ? `${user.photoUrl}?signed=1` : null,
			settings: user.settings,
		})
	),
}))

import UpdateUserProfile from '@/useCases/updateUserProfile.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { ConflictError, ValidationError } from '@/errors'

const now = new Date()

function userRecord(
	overrides: { photoUrl?: string | null; name?: string | null; nickname?: string; id?: string } = {}
) {
	return {
		id: overrides.id ?? 'user-1',
		name: overrides.name ?? 'Ada',
		nickname: overrides.nickname ?? 'ada',
		email: 'ada@example.com',
		passwordHash: 'hash',
		photoUrl: overrides.photoUrl === undefined ? 'https://cdn.example/a.jpg' : overrides.photoUrl,
		settings: [],
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
	}
}

describe('UpdateUserProfile', () => {
	it('persiste photoUrl nulo ao remover a foto', async () => {
		const current = userRecord()
		const findFirst = jest.fn(async () => current)
		const update = jest.fn(async ({ data }: { data: { photoUrl?: string | null } }) =>
			userRecord({ photoUrl: data.photoUrl ?? null })
		)

		mockPrismaRuntime({ user: { findFirst, update } })

		const useCase = new UpdateUserProfile()
		const result = await useCase.run({ userId: 'user-1', photoUrl: null })

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ photoUrl: null }),
			})
		)
		expect(result.user.photoUrl).toBeNull()
	})

	it('não envia photoUrl quando o campo não veio no input', async () => {
		const current = userRecord()
		const findFirst = jest.fn(async () => current)
		const update = jest.fn(async ({ data }: { data: { name?: string | null } }) =>
			userRecord({ name: data.name ?? current.name })
		)

		mockPrismaRuntime({ user: { findFirst, update } })

		const useCase = new UpdateUserProfile()
		await useCase.run({ userId: 'user-1', name: 'Ada Lovelace' })

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { name: 'Ada Lovelace' },
			})
		)
	})

	it('não permite trocar caixa para roubar nickname de outro', async () => {
		const current = userRecord({ nickname: 'bob' })
		const findFirst = jest.fn(async ({ where }: { where: { AND?: Array<Record<string, unknown>> } }) => {
			const clauses = where.AND ?? []
			const nick = clauses.find((part) => typeof part.nickname === 'string')?.nickname
			if (nick === 'admin') {
				return userRecord({ id: 'user-2', nickname: 'admin' })
			}
			const id = clauses.find((part) => typeof part.id === 'string')?.id
			if (id === 'user-1') {
				return current
			}
			return null
		})
		const update = jest.fn()

		mockPrismaRuntime({ user: { findFirst, update } })

		const useCase = new UpdateUserProfile()
		await expect(useCase.run({ userId: 'user-1', nickname: 'Admin' })).rejects.toBeInstanceOf(ConflictError)
		expect(update).not.toHaveBeenCalled()
	})

	it('rejeita nickname inválido (cirílico)', async () => {
		const current = userRecord()
		const findFirst = jest.fn(async () => current)
		mockPrismaRuntime({ user: { findFirst, update: jest.fn() } })

		const useCase = new UpdateUserProfile()
		await expect(useCase.run({ userId: 'user-1', nickname: 'аdmin' })).rejects.toBeInstanceOf(ValidationError)
	})
})
