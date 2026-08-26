const presignImageUrl = jest.fn(async (url: string) => `${url}?signed=1`)

jest.mock('@/services/Storage/StorageUrl.service', () => {
	const impl = { presignImageUrl }
	return {
		__esModule: true,
		default: jest.fn().mockImplementation(() => impl),
		getStorageUrlService: () => impl,
	}
})

import UpdateUserImage from '@/useCases/updateUserImage.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { NotFoundError, ValidationError } from '@/errors'
import { Visibility } from '@/constants/visibility'
import { SETTINGS_KEYS } from '@/managers/Settings.manager'

const IMAGE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const OWNER_ID = 'owner-1'

function imageRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: IMAGE_ID,
		ownerId: OWNER_ID,
		url: 'https://example.com/a.jpg',
		title: 'Title',
		description: 'Desc',
		tags: ['tag'],
		fileId: null,
		visibility: Visibility.PRIVATE,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		...overrides,
	}
}

function ownerUser(showSecretImages = false) {
	return {
		id: OWNER_ID,
		name: 'Ada',
		nickname: 'ada',
		email: 'ada@example.com',
		passwordHash: 'hash',
		photoUrl: null,
		settings: showSecretImages ? [{ key: SETTINGS_KEYS.SHOW_SECRET_IMAGES, value: true }] : [],
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
	}
}

describe('UpdateUserImage', () => {
	beforeEach(() => {
		presignImageUrl.mockClear()
		presignImageUrl.mockImplementation(async (url: string) => `${url}?signed=1`)
	})

	it('atualiza título e descrição sem enviar visibility', async () => {
		const current = imageRecord()
		const findFirstImage = jest.fn(async () => current)
		const findFirstUser = jest.fn(async () => ownerUser())
		const update = jest.fn(async ({ data }: { data: { title?: string | null; description?: string | null } }) =>
			imageRecord({ title: data.title ?? current.title, description: data.description ?? current.description })
		)

		mockPrismaRuntime({
			image: { findFirst: findFirstImage, update },
			user: { findFirst: findFirstUser },
		})

		const useCase = new UpdateUserImage()
		const result = await useCase.run({
			userId: OWNER_ID,
			imageId: IMAGE_ID,
			title: 'New title',
			description: 'New description',
		})

		expect(update).toHaveBeenCalledTimes(1)
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { title: 'New title', description: 'New description' },
			})
		)
		const data = update.mock.calls[0]?.[0]?.data as Record<string, unknown>
		expect(data).not.toHaveProperty('visibility')
		expect(result.image.visibility).toBe(Visibility.PRIVATE)
		expect(result.image.url).toBe('https://example.com/a.jpg')
		expect(presignImageUrl).toHaveBeenCalledWith('https://example.com/a.jpg', Visibility.PRIVATE)
		expect(result.mosaic).toMatchObject({
			title: 'New title',
			visibility: Visibility.PRIVATE,
			isOwner: true,
			url: 'https://example.com/a.jpg?signed=1',
		})
	})

	it('não atualiza SECRET quando a setting está desligada', async () => {
		const update = jest.fn()
		mockPrismaRuntime({
			image: { findFirst: jest.fn(async () => imageRecord({ visibility: Visibility.SECRET })), update },
			user: { findFirst: jest.fn(async () => ownerUser(false)) },
		})

		const useCase = new UpdateUserImage()
		await expect(
			useCase.run({
				userId: OWNER_ID,
				imageId: IMAGE_ID,
				title: 'Nope',
			})
		).rejects.toBeInstanceOf(NotFoundError)
		expect(update).not.toHaveBeenCalled()
	})

	it('rejeita título acima do teto sem persistir', async () => {
		const update = jest.fn()
		mockPrismaRuntime({
			image: { findFirst: jest.fn(async () => imageRecord()), update },
			user: { findFirst: jest.fn(async () => ownerUser()) },
		})

		const useCase = new UpdateUserImage()
		await expect(
			useCase.run({
				userId: OWNER_ID,
				imageId: IMAGE_ID,
				title: 'a'.repeat(201),
			})
		).rejects.toBeInstanceOf(ValidationError)
		expect(update).not.toHaveBeenCalled()
	})

	it('atualiza tags junto com metadados', async () => {
		const current = imageRecord({ tags: ['old'] })
		const findFirstImage = jest.fn(async () => current)
		const findFirstUser = jest.fn(async () => ownerUser())
		const update = jest.fn(async ({ data }: { data: { tags?: string[] } }) =>
			imageRecord({ tags: data.tags ?? current.tags })
		)

		mockPrismaRuntime({
			image: { findFirst: findFirstImage, update },
			user: { findFirst: findFirstUser },
		})

		const useCase = new UpdateUserImage()
		const result = await useCase.run({
			userId: OWNER_ID,
			imageId: IMAGE_ID,
			tags: ['new', 'tag'],
		})

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { tags: ['new', 'tag'] },
			})
		)
		expect(result.mosaic.tags).toEqual(['new', 'tag'])
	})
})
