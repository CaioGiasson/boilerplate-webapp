import { ConflictError, ForbiddenError, ServiceError, ValidationError } from '@/errors'
import { USER_STORAGE_QUOTA_BYTES } from '@/constants/storageQuota'
import FileManager, { thumbnailKeyFor } from '@/services/Storage/File.manager'
import type { ImageProcessorPort } from '@/services/Storage/imageProcessor'

const OWNER_ID = '507f1f77bcf86cd799439011'
const KEY_PATTERN = /^[a-f0-9]{24}\/(images|avatars)\/[a-f0-9]{32}\.webp$/
const MAIN = Buffer.from('main-webp-bytes')
const THUMBNAIL = Buffer.from('thumb')

const fakeProcessor: ImageProcessorPort = {
	process: jest.fn(async () => ({ main: MAIN, thumbnail: THUMBNAIL, mimeType: 'image/webp' as const })),
}

function createManager(overrides?: {
	findByKey?: jest.Mock
	createPending?: jest.Mock
	markPublished?: jest.Mock
	markFailed?: jest.Mock
	upload?: jest.Mock
	deleteObject?: jest.Mock
	sumPublishedBytesByOwner?: jest.Mock
	processor?: ImageProcessorPort
}) {
	const findByKey = overrides?.findByKey ?? jest.fn(async () => null)
	const sumPublishedBytesByOwner = overrides?.sumPublishedBytesByOwner ?? jest.fn(async () => 0)
	const createPending = overrides?.createPending ?? jest.fn(async () => ({ id: 'file-1' }))
	const markPublished = overrides?.markPublished ?? jest.fn(async () => undefined)
	const markFailed = overrides?.markFailed ?? jest.fn(async () => undefined)
	const deleteObject = overrides?.deleteObject ?? jest.fn(async () => undefined)
	const buildPublicUrl = jest.fn((key: string) => `https://cdn.example.com/${key}`)
	const upload =
		overrides?.upload ??
		jest.fn(async ({ key }: { key: string }) => ({
			key,
			url: `https://cdn.example.com/${key}`,
		}))

	const manager = new FileManager(
		{ upload, buildPublicUrl, deleteObject } as never,
		{ findByKey, createPending, markPublished, markFailed, sumPublishedBytesByOwner } as never,
		overrides?.processor ?? fakeProcessor
	)

	return { manager, findByKey, createPending, upload, markPublished, markFailed, deleteObject }
}

describe('thumbnailKeyFor', () => {
	it('troca .webp por .thumb.webp mantendo o prefixo', () => {
		expect(thumbnailKeyFor('owner/avatars/abc.webp')).toBe('owner/avatars/abc.thumb.webp')
	})
})

describe('FileManager', () => {
	it('storeImage envia a imagem normalizada e o thumbnail, com key prefixada pelo ownerId', async () => {
		const { manager, createPending, upload, markPublished } = createManager()

		const stored = await manager.storeImage({ buffer: Buffer.from('original'), ownerId: OWNER_ID })

		const key = createPending.mock.calls[0][0].key as string
		expect(key).toMatch(KEY_PATTERN)
		expect(key.startsWith(`${OWNER_ID}/images/`)).toBe(true)
		expect(key).not.toMatch(/(^|\/)(dev|prod|test)\//)
		const thumbnailKey = thumbnailKeyFor(key)
		expect(upload).toHaveBeenNthCalledWith(1, { key, buffer: MAIN, contentType: 'image/webp' })
		expect(upload).toHaveBeenNthCalledWith(2, { key: thumbnailKey, buffer: THUMBNAIL, contentType: 'image/webp' })
		expect(createPending).toHaveBeenCalledWith(
			expect.objectContaining({
				thumbnailKey,
				thumbnailUrl: `https://cdn.example.com/${thumbnailKey}`,
				mimeType: 'image/webp',
				sizeBytes: MAIN.byteLength + THUMBNAIL.byteLength,
			})
		)
		expect(markPublished).toHaveBeenCalledWith('file-1')
		expect(stored).toEqual({
			url: `https://cdn.example.com/${key}`,
			thumbnailUrl: `https://cdn.example.com/${thumbnailKey}`,
			fileId: 'file-1',
		})
	})

	it('storeAvatar usa a categoria avatars e a variante avatar do processador', async () => {
		const processor: ImageProcessorPort = { process: jest.fn(fakeProcessor.process) }
		const { manager, createPending } = createManager({ processor })

		const stored = await manager.storeAvatar({ buffer: Buffer.from('avatar'), ownerId: OWNER_ID })

		const key = createPending.mock.calls[0][0].key as string
		expect(key.startsWith(`${OWNER_ID}/avatars/`)).toBe(true)
		expect(stored.url).toBe(`https://cdn.example.com/${key}`)
		expect(processor.process).toHaveBeenCalledWith(expect.any(Buffer), 'avatar')
	})

	it('regenera a key quando findByKey encontra colisão', async () => {
		const findByKey = jest.fn().mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null)
		const { manager, createPending } = createManager({ findByKey })

		await manager.storeImage({ buffer: Buffer.from('x'), ownerId: OWNER_ID })

		expect(findByKey).toHaveBeenCalledTimes(2)
		const firstKey = findByKey.mock.calls[0][0] as string
		const secondKey = findByKey.mock.calls[1][0] as string
		expect(secondKey).not.toBe(firstKey)
		expect(createPending.mock.calls[0][0].key).toBe(secondKey)
	})

	it('falha com ServiceError se todas as tentativas colidem', async () => {
		const findByKey = jest.fn(async () => ({ id: 'existing' }))
		const { manager, upload } = createManager({ findByKey })

		await expect(manager.storeImage({ buffer: Buffer.from('x'), ownerId: OWNER_ID })).rejects.toBeInstanceOf(
			ServiceError
		)

		expect(findByKey).toHaveBeenCalledTimes(5)
		expect(upload).not.toHaveBeenCalled()
	})

	it('rejeita ownerId vazio sem processar a imagem', async () => {
		const processor: ImageProcessorPort = { process: jest.fn() }
		const { manager, upload } = createManager({ processor })

		await expect(manager.storeImage({ buffer: Buffer.from('x'), ownerId: '' })).rejects.toBeInstanceOf(
			ValidationError
		)

		expect(processor.process).not.toHaveBeenCalled()
		expect(upload).not.toHaveBeenCalled()
	})

	it('regenera a key quando createPending colide (P2002)', async () => {
		const createPending = jest
			.fn()
			.mockRejectedValueOnce(new ConflictError('Storage key already in use'))
			.mockResolvedValueOnce({ id: 'file-2' })
		const { manager, upload } = createManager({ createPending })

		const stored = await manager.storeImage({ buffer: Buffer.from('x'), ownerId: OWNER_ID })

		expect(createPending).toHaveBeenCalledTimes(2)
		expect(upload).toHaveBeenCalledTimes(2)
		expect(stored.fileId).toBe('file-2')
	})

	it('rejeita upload acima da cota de 1 GiB contando o thumbnail', async () => {
		const sumPublishedBytesByOwner = jest.fn(async () => USER_STORAGE_QUOTA_BYTES - MAIN.byteLength)
		const { manager, upload } = createManager({ sumPublishedBytesByOwner })

		await expect(manager.storeImage({ buffer: Buffer.from('x'), ownerId: OWNER_ID })).rejects.toBeInstanceOf(
			ForbiddenError
		)
		expect(upload).not.toHaveBeenCalled()
	})

	it('apaga o objeto principal e marca failed se o upload do thumbnail falhar', async () => {
		const upload = jest
			.fn()
			.mockImplementationOnce(async ({ key }: { key: string }) => ({
				key,
				url: `https://cdn.example.com/${key}`,
			}))
			.mockRejectedValueOnce(new Error('spaces down'))
		const { manager, createPending, deleteObject, markFailed, markPublished } = createManager({ upload })

		await expect(manager.storeImage({ buffer: Buffer.from('x'), ownerId: OWNER_ID })).rejects.toThrow('spaces down')

		const key = createPending.mock.calls[0][0].key as string
		expect(deleteObject).toHaveBeenCalledWith(key)
		expect(markFailed).toHaveBeenCalledWith('file-1')
		expect(markPublished).not.toHaveBeenCalled()
	})

	it('não envia nada ao storage se o processador recusar a imagem', async () => {
		const processor: ImageProcessorPort = {
			process: jest.fn(async () => {
				throw new ValidationError('Invalid image')
			}),
		}
		const { manager, upload, createPending } = createManager({ processor })

		await expect(manager.storeAvatar({ buffer: Buffer.from('lixo'), ownerId: OWNER_ID })).rejects.toBeInstanceOf(
			ValidationError
		)
		expect(createPending).not.toHaveBeenCalled()
		expect(upload).not.toHaveBeenCalled()
	})
})

describe('FileManager exclusão', () => {
	it('deletePublishedByFileId apaga principal e thumbnail e marca orphan', async () => {
		const deleteObject = jest.fn(async () => undefined)
		const markOrphanByUrl = jest.fn(async () => undefined)
		const manager = new FileManager(
			{ deleteObject } as never,
			{
				findById: jest.fn(async () => ({
					key: 'o/avatars/a.webp',
					thumbnailKey: 'o/avatars/a.thumb.webp',
					url: 'u',
				})),
				markOrphanByUrl,
			} as never
		)

		await manager.deletePublishedByFileId('file-1')

		expect(deleteObject).toHaveBeenCalledWith('o/avatars/a.webp')
		expect(deleteObject).toHaveBeenCalledWith('o/avatars/a.thumb.webp')
		expect(markOrphanByUrl).toHaveBeenCalledWith('u')
	})

	it('arquivos legados sem thumbnailKey apagam só o objeto principal', async () => {
		const deleteObject = jest.fn(async () => undefined)
		const manager = new FileManager(
			{ deleteObject } as never,
			{
				listOwnedForErasure: jest.fn(async () => [
					{ id: 'f1', key: 'o/avatars/legacy.jpg', thumbnailKey: null },
					{ id: 'f2', key: 'o/avatars/new.webp', thumbnailKey: 'o/avatars/new.thumb.webp' },
				]),
				markOrphanById: jest.fn(async () => undefined),
			} as never
		)

		await manager.deleteAllOwnedObjectsByOwner('o')

		expect(deleteObject.mock.calls.map((call) => call[0])).toEqual([
			'o/avatars/legacy.jpg',
			'o/avatars/new.webp',
			'o/avatars/new.thumb.webp',
		])
	})
})
