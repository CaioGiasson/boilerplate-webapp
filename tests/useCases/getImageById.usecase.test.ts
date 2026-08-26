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

import GetImageById from '@/useCases/getImageById.usecase'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'
import { NotFoundError } from '@/errors'
import { Visibility } from '@/constants/visibility'
import { buildImage, DEFAULT_CANONICAL_URL, DEFAULT_IMAGE_ID } from '../factories'
import type { ImageEntity } from '@/repositories/Image.repository'

const IMAGE_ID = DEFAULT_IMAGE_ID
const CANONICAL_URL = DEFAULT_CANONICAL_URL

function commanderWithImage(image: ImageEntity | null, ownerDeletedAt: Date | null = null) {
	const findFirstImage = jest.fn(async () => image)
	const findFirstUser = jest.fn(async () =>
		image
			? {
					id: image.ownerId,
					deletedAt: ownerDeletedAt,
					nickname: 'owner',
					email: 'owner@example.com',
					passwordHash: 'hash',
					name: null,
					photoUrl: null,
					settings: [],
					createdAt: new Date(),
					updatedAt: new Date(),
				}
			: null
	)
	mockPrismaRuntime({
		image: { findFirst: findFirstImage },
		user: { findFirst: findFirstUser },
	})
	return { findFirst: findFirstImage }
}

describe('GetImageById', () => {
	beforeEach(() => {
		presignImageUrl.mockClear()
		presignImageUrl.mockImplementation(async (url: string) => `${url}?signed=1`)
	})

	it('retorna mosaico com id quando a imagem PUBLIC existe', async () => {
		commanderWithImage(buildImage())
		const useCase = new GetImageById()
		const result = await useCase.run({ imageId: IMAGE_ID })

		expect(result.mosaic).toEqual({
			id: IMAGE_ID,
			url: `${CANONICAL_URL}?signed=1`,
			title: 'Title',
			description: 'Desc',
			tags: ['tag'],
		})
		expect(presignImageUrl).toHaveBeenCalledWith(CANONICAL_URL, Visibility.PUBLIC)
	})

	it('inclui isOwner e visibility quando o viewer é o dono', async () => {
		commanderWithImage(buildImage({ visibility: Visibility.PRIVATE }))
		const useCase = new GetImageById()
		const result = await useCase.run({
			imageId: IMAGE_ID,
			viewerUserId: 'owner-1',
			showSecretImages: false,
		})

		expect(result.mosaic).toMatchObject({
			id: IMAGE_ID,
			isOwner: true,
			visibility: Visibility.PRIVATE,
			url: `${CANONICAL_URL}?signed=1`,
		})
		expect(result.mosaic.url).not.toBe(CANONICAL_URL)
		expect(presignImageUrl).toHaveBeenCalledWith(CANONICAL_URL, Visibility.PRIVATE)
	})

	it('lança NotFoundError quando a imagem não existe', async () => {
		commanderWithImage(null)
		const useCase = new GetImageById()
		await expect(useCase.run({ imageId: IMAGE_ID })).rejects.toBeInstanceOf(NotFoundError)
		expect(presignImageUrl).not.toHaveBeenCalled()
	})

	it('lança NotFoundError para id com formato inválido', async () => {
		const { findFirst } = commanderWithImage(null)
		const useCase = new GetImageById()
		await expect(useCase.run({ imageId: 'missing' })).rejects.toBeInstanceOf(NotFoundError)
		expect(findFirst).not.toHaveBeenCalled()
		expect(presignImageUrl).not.toHaveBeenCalled()
	})

	it('visitante não vê PRIVATE e recebe NotFoundError', async () => {
		commanderWithImage(buildImage({ visibility: Visibility.PRIVATE }))
		const useCase = new GetImageById()
		await expect(useCase.run({ imageId: IMAGE_ID })).rejects.toBeInstanceOf(NotFoundError)
		expect(presignImageUrl).not.toHaveBeenCalled()
	})

	it('outro usuário não vê PRIVATE', async () => {
		commanderWithImage(buildImage({ visibility: Visibility.PRIVATE }))
		const useCase = new GetImageById()
		await expect(
			useCase.run({ imageId: IMAGE_ID, viewerUserId: 'other-user', showSecretImages: true })
		).rejects.toBeInstanceOf(NotFoundError)
		expect(presignImageUrl).not.toHaveBeenCalled()
	})

	it('outro usuário não vê SECRET mesmo com showSecretImages', async () => {
		commanderWithImage(buildImage({ visibility: Visibility.SECRET }))
		const useCase = new GetImageById()
		await expect(
			useCase.run({ imageId: IMAGE_ID, viewerUserId: 'other-user', showSecretImages: true })
		).rejects.toBeInstanceOf(NotFoundError)
		expect(presignImageUrl).not.toHaveBeenCalled()
	})

	it('SECRET exige showSecretImages mesmo para o dono', async () => {
		commanderWithImage(buildImage({ visibility: Visibility.SECRET }))
		const useCase = new GetImageById()
		await expect(
			useCase.run({ imageId: IMAGE_ID, viewerUserId: 'owner-1', showSecretImages: false })
		).rejects.toBeInstanceOf(NotFoundError)
		expect(presignImageUrl).not.toHaveBeenCalled()

		await expect(
			useCase.run({ imageId: IMAGE_ID, viewerUserId: 'owner-1', showSecretImages: true })
		).resolves.toMatchObject({
			mosaic: {
				isOwner: true,
				visibility: Visibility.SECRET,
				url: `${CANONICAL_URL}?signed=1`,
			},
		})
		expect(presignImageUrl).toHaveBeenCalledTimes(1)
		expect(presignImageUrl).toHaveBeenCalledWith(CANONICAL_URL, Visibility.SECRET)
	})

	it('PROTECTED nunca é retornada', async () => {
		commanderWithImage(buildImage({ visibility: Visibility.PROTECTED }))
		const useCase = new GetImageById()
		await expect(
			useCase.run({ imageId: IMAGE_ID, viewerUserId: 'owner-1', showSecretImages: true })
		).rejects.toBeInstanceOf(NotFoundError)
		expect(presignImageUrl).not.toHaveBeenCalled()
	})

	it('imagem de owner em quarentena retorna NotFoundError', async () => {
		commanderWithImage(buildImage(), new Date('2026-08-01T00:00:00.000Z'))
		const useCase = new GetImageById()
		await expect(useCase.run({ imageId: IMAGE_ID })).rejects.toBeInstanceOf(NotFoundError)
		expect(presignImageUrl).not.toHaveBeenCalled()
	})
})
