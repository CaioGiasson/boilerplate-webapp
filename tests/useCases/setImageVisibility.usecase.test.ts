const presignImageUrl = jest.fn(async (url: string) => `${url}?signed=1`)

jest.mock('@/services/Storage/StorageUrl.service', () => {
	const impl = {
		presignImageUrl,
	}
	return {
		__esModule: true,
		default: jest.fn().mockImplementation(() => impl),
		getStorageUrlService: () => impl,
	}
})

import SetImageVisibility from '@/useCases/setImageVisibility.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { ForbiddenError, NotFoundError, ValidationError } from '@/errors'
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
		visibility: Visibility.PUBLIC,
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

function createCommander(options: {
	image?: ReturnType<typeof imageRecord> | null
	user?: ReturnType<typeof ownerUser> | null
}) {
	const image = options.image === undefined ? imageRecord() : options.image
	const user = options.user === undefined ? ownerUser() : options.user
	const findFirstImage = jest.fn(async () => image)
	const findFirstUser = jest.fn(async () => user)
	const update = jest.fn(async ({ data }: { data: { visibility?: string } }) =>
		imageRecord({ ...image, visibility: data.visibility ?? image?.visibility })
	)

	mockPrismaRuntime({
		image: { findFirst: findFirstImage, update },
		user: { findFirst: findFirstUser },
	})

	return { findFirstImage, findFirstUser, update }
}

describe('SetImageVisibility', () => {
	beforeEach(() => {
		presignImageUrl.mockClear()
		presignImageUrl.mockImplementation(async (url: string) => `${url}?signed=1`)
	})

	it('permite o dono alterar visibilidade', async () => {
		const { update } = createCommander({ image: imageRecord({ visibility: Visibility.PUBLIC }) })
		const useCase = new SetImageVisibility()
		const result = await useCase.run({
			userId: OWNER_ID,
			imageId: IMAGE_ID,
			visibility: Visibility.PRIVATE,
		})

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { visibility: Visibility.PRIVATE },
			})
		)
		expect(presignImageUrl).toHaveBeenCalledWith('https://example.com/a.jpg', Visibility.PRIVATE)
		expect(result.mosaic).toMatchObject({
			isOwner: true,
			visibility: Visibility.PRIVATE,
			url: 'https://example.com/a.jpg?signed=1',
		})
	})

	it('rejeita SECRET sem a setting', async () => {
		const { update } = createCommander({
			image: imageRecord({ visibility: Visibility.PUBLIC }),
			user: ownerUser(false),
		})
		const useCase = new SetImageVisibility()
		await expect(
			useCase.run({
				userId: OWNER_ID,
				imageId: IMAGE_ID,
				visibility: Visibility.SECRET,
			})
		).rejects.toBeInstanceOf(ForbiddenError)
		expect(update).not.toHaveBeenCalled()
	})

	it('permite SECRET com a setting ligada', async () => {
		const { update } = createCommander({
			image: imageRecord({ visibility: Visibility.PRIVATE }),
			user: ownerUser(true),
		})
		const useCase = new SetImageVisibility()
		await useCase.run({
			userId: OWNER_ID,
			imageId: IMAGE_ID,
			visibility: Visibility.SECRET,
		})
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { visibility: Visibility.SECRET },
			})
		)
	})

	it('rejeita alvo PROTECTED', async () => {
		const { update } = createCommander({})
		const useCase = new SetImageVisibility()
		await expect(
			useCase.run({
				userId: OWNER_ID,
				imageId: IMAGE_ID,
				visibility: Visibility.PROTECTED,
			})
		).rejects.toBeInstanceOf(ValidationError)
		expect(update).not.toHaveBeenCalled()
	})

	it('não altera imagem já PROTECTED', async () => {
		const { update } = createCommander({
			image: imageRecord({ visibility: Visibility.PROTECTED }),
			user: ownerUser(true),
		})
		const useCase = new SetImageVisibility()
		await expect(
			useCase.run({
				userId: OWNER_ID,
				imageId: IMAGE_ID,
				visibility: Visibility.PUBLIC,
			})
		).rejects.toBeInstanceOf(ForbiddenError)
		expect(update).not.toHaveBeenCalled()
	})

	it('não vaza existência para quem não é dono', async () => {
		const { update } = createCommander({
			image: imageRecord({ ownerId: OWNER_ID }),
		})
		const useCase = new SetImageVisibility()
		await expect(
			useCase.run({
				userId: 'other-user',
				imageId: IMAGE_ID,
				visibility: Visibility.PRIVATE,
			})
		).rejects.toBeInstanceOf(NotFoundError)
		expect(update).not.toHaveBeenCalled()
	})
})
