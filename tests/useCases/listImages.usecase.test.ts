jest.mock('@/services/Storage/StorageUrl.service', () => {
	const impl = {
		withSignedImageEntities: jest.fn(async (images: { url: string }[]) =>
			images.map((image) => ({ ...image, url: `${image.url}?signed=1` }))
		),
	}
	return {
		__esModule: true,
		default: jest.fn().mockImplementation(() => impl),
		getStorageUrlService: () => impl,
	}
})

import ListUserImages from '@/useCases/listUserImages.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import ListUserImageTags from '@/useCases/listUserImageTags.usecase'
import { Visibility } from '@/constants/visibility'

function imageRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: '1',
		ownerId: 'a',
		url: 'https://example.com/a.jpg',
		title: 'A',
		description: null,
		tags: ['x'],
		fileId: null,
		visibility: Visibility.PUBLIC,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		...overrides,
	}
}

function activeOwnerUser(id: string) {
	return {
		id,
		deletedAt: null,
		nickname: 'owner',
		email: 'owner@example.com',
		passwordHash: 'hash',
		name: null,
		photoUrl: null,
		settings: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	}
}

describe('ListUserImages', () => {
	it('busca sem ownerId quando o escopo é público e filtra só PUBLIC', async () => {
		const findMany = jest.fn(async (_args?: unknown) => [imageRecord()])

		mockPrismaRuntime({
			image: { findMany },
			user: { findMany: jest.fn(async () => []) },
		})

		const useCase = new ListUserImages()
		const result = await useCase.run({ q: 'A' })

		expect(findMany).toHaveBeenCalled()
		const callArg = findMany.mock.calls[0]?.[0] as { where: unknown }
		const whereJson = JSON.stringify(callArg.where)
		expect(whereJson).not.toContain('"ownerId"')
		expect(whereJson).toContain('"visibility"')
		expect(whereJson).toContain('PUBLIC')
		expect(result.mosaic).toHaveLength(1)
		expect(result.mosaic[0]).toMatchObject({ id: '1', title: 'A', url: 'https://example.com/a.jpg?signed=1' })
	})

	it('inclui ownerId na busca quando informado', async () => {
		const findMany = jest.fn(async (_args?: unknown) => [])
		mockPrismaRuntime({
			image: { findMany },
			user: { findFirst: jest.fn(async () => activeOwnerUser('owner-42')) },
		})

		const useCase = new ListUserImages()
		await useCase.run({ ownerId: 'owner-42' })

		const callArg = findMany.mock.calls[0]?.[0] as { where: unknown }
		expect(JSON.stringify(callArg.where)).toContain('owner-42')
	})

	it('aplica visibilities do scope all só com PUBLIC', async () => {
		const findMany = jest.fn(async (_args?: unknown) => [])
		mockPrismaRuntime({ image: { findMany }, user: { findMany: jest.fn(async () => []) } })

		const useCase = new ListUserImages()
		await useCase.run({ visibilities: [Visibility.PUBLIC] })

		const callArg = findMany.mock.calls[0]?.[0] as { where: unknown }
		const whereJson = JSON.stringify(callArg.where)
		expect(whereJson).toContain('PUBLIC')
		expect(whereJson).not.toContain('PRIVATE')
		expect(whereJson).not.toContain('SECRET')
		expect(whereJson).not.toContain('PROTECTED')
	})

	it('scope mine sem secret lista PUBLIC+PRIVATE e assina URLs', async () => {
		const findMany = jest.fn(async (_args?: unknown) => [
			imageRecord({ id: 'priv-1', visibility: Visibility.PRIVATE, url: 'https://cdn.example/owner/private.jpg' }),
		])
		mockPrismaRuntime({
			image: { findMany },
			user: { findFirst: jest.fn(async () => activeOwnerUser('a')) },
		})

		const useCase = new ListUserImages()
		const result = await useCase.run({
			ownerId: 'a',
			visibilities: [Visibility.PUBLIC, Visibility.PRIVATE],
			viewerUserId: 'a',
		})

		const whereJson = JSON.stringify((findMany.mock.calls[0]?.[0] as { where: unknown }).where)
		expect(whereJson).toContain('PUBLIC')
		expect(whereJson).toContain('PRIVATE')
		expect(whereJson).not.toContain('SECRET')
		expect(result.mosaic[0]?.url).toBe('https://cdn.example/owner/private.jpg?signed=1')
	})

	it('scope mine com secret inclui SECRET no filtro', async () => {
		const findMany = jest.fn(async (_args?: unknown) => [])
		mockPrismaRuntime({
			image: { findMany },
			user: { findFirst: jest.fn(async () => activeOwnerUser('a')) },
		})

		const useCase = new ListUserImages()
		await useCase.run({
			ownerId: 'a',
			visibilities: [Visibility.PUBLIC, Visibility.PRIVATE, Visibility.SECRET],
		})

		const whereJson = JSON.stringify((findMany.mock.calls[0]?.[0] as { where: unknown }).where)
		expect(whereJson).toContain('SECRET')
	})

	it('owner em quarentena retorna lista vazia', async () => {
		const findMany = jest.fn(async (_args?: unknown) => [imageRecord()])
		mockPrismaRuntime({
			image: { findMany },
			user: {
				findFirst: jest.fn(async () => ({
					...activeOwnerUser('a'),
					deletedAt: new Date('2026-08-01T00:00:00.000Z'),
				})),
			},
		})

		const useCase = new ListUserImages()
		const result = await useCase.run({ ownerId: 'a' })

		expect(result.mosaic).toEqual([])
		expect(findMany).not.toHaveBeenCalled()
	})

	it('pagina com nextCursor quando há mais que uma página', async () => {
		const createdAt = new Date('2026-08-19T00:00:00.000Z')
		const rows = Array.from({ length: 41 }, (_, index) =>
			imageRecord({
				id: String(41 - index),
				createdAt,
			})
		)
		const findMany = jest.fn(async (_args?: unknown) => rows)
		mockPrismaRuntime({ image: { findMany }, user: { findMany: jest.fn(async () => []) } })

		const useCase = new ListUserImages()
		const result = await useCase.run({})

		expect(result.mosaic).toHaveLength(40)
		expect(result.nextCursor).toBe(`${createdAt.toISOString()}|2`)
	})
})

describe('ListUserImageTags', () => {
	it('lista tags globais sem ownerId', async () => {
		const findMany = jest.fn(async () => [{ tags: ['alpha'] }, { tags: ['beta'] }])
		mockPrismaRuntime({ image: { findMany } })

		const useCase = new ListUserImageTags()
		await expect(useCase.run({})).resolves.toEqual({ tags: ['alpha', 'beta'] })
	})

	it('filtra tags por visibilities quando informado', async () => {
		const findMany = jest.fn(async (_args?: unknown) => [{ tags: ['glass'] }])
		mockPrismaRuntime({ image: { findMany } })

		const useCase = new ListUserImageTags()
		await useCase.run({ visibilities: [Visibility.PUBLIC] })

		const firstCall = findMany.mock.calls.at(0) as unknown as [{ where: unknown }] | undefined
		expect(JSON.stringify(firstCall?.[0].where)).toContain('PUBLIC')
	})
})
