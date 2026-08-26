import { ConflictError, ForbiddenError, ServiceError, ValidationError } from '@/errors'
import { USER_STORAGE_QUOTA_BYTES } from '@/constants/storageQuota'
import FileManager from '@/services/Storage/File.manager'

const OWNER_ID = '507f1f77bcf86cd799439011'
const KEY_PATTERN = /^[a-f0-9]{24}\/(images|avatars)\/[a-f0-9]{32}\.(jpg|png|webp|gif)$/

function createManager(overrides?: {
	findByKey?: jest.Mock
	createPending?: jest.Mock
	markPublished?: jest.Mock
	markFailed?: jest.Mock
	upload?: jest.Mock
	buildPublicUrl?: jest.Mock
}) {
	const findByKey = overrides?.findByKey ?? jest.fn(async () => null)
	const sumPublishedBytesByOwner = jest.fn(async () => 0)
	const createPending = overrides?.createPending ?? jest.fn(async () => ({ id: 'file-1' }))
	const markPublished = overrides?.markPublished ?? jest.fn(async () => undefined)
	const markFailed = overrides?.markFailed ?? jest.fn(async () => undefined)
	const buildPublicUrl = overrides?.buildPublicUrl ?? jest.fn((key: string) => `https://cdn.example.com/${key}`)
	const upload =
		overrides?.upload ??
		jest.fn(async ({ key }: { key: string }) => ({
			key,
			url: `https://cdn.example.com/${key}`,
		}))

	const manager = new FileManager(
		{ upload, buildPublicUrl } as never,
		{ findByKey, createPending, markPublished, markFailed, sumPublishedBytesByOwner } as never
	)

	return { manager, findByKey, createPending, upload, buildPublicUrl, markPublished }
}

describe('FileManager', () => {
	it('storeImage gera key longa prefixada pelo ownerId, sem environment', async () => {
		const { manager, createPending, upload } = createManager()
		const buffer = Buffer.from('image-bytes')

		const stored = await manager.storeImage({
			buffer,
			mimeType: 'image/jpeg',
			ownerId: OWNER_ID,
		})

		const key = createPending.mock.calls[0][0].key as string
		expect(key).toMatch(KEY_PATTERN)
		expect(key.startsWith(`${OWNER_ID}/images/`)).toBe(true)
		expect(key).not.toMatch(/(^|\/)(dev|prod|test)\//)
		expect(upload).toHaveBeenCalledWith(
			expect.objectContaining({
				key,
				buffer,
				contentType: 'image/jpeg',
			})
		)
		expect(stored.url).toBe(`https://cdn.example.com/${key}`)
		expect(stored.fileId).toBe('file-1')
	})

	it('storeAvatar gera key longa na categoria avatars', async () => {
		const { manager, createPending } = createManager()

		const url = await manager.storeAvatar({
			buffer: Buffer.from('avatar-bytes'),
			mimeType: 'image/png',
			ownerId: OWNER_ID,
		})

		const key = createPending.mock.calls[0][0].key as string
		expect(key).toMatch(KEY_PATTERN)
		expect(key.startsWith(`${OWNER_ID}/avatars/`)).toBe(true)
		expect(url).toBe(`https://cdn.example.com/${key}`)
	})

	it('regenera a key quando findByKey encontra colisão', async () => {
		const findByKey = jest.fn().mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null)
		const { manager, upload, createPending } = createManager({ findByKey })

		await manager.storeImage({
			buffer: Buffer.from('image-bytes'),
			mimeType: 'image/webp',
			ownerId: OWNER_ID,
		})

		expect(findByKey).toHaveBeenCalledTimes(2)
		const firstKey = findByKey.mock.calls[0][0] as string
		const secondKey = findByKey.mock.calls[1][0] as string
		expect(firstKey).toMatch(KEY_PATTERN)
		expect(secondKey).toMatch(KEY_PATTERN)
		expect(secondKey).not.toBe(firstKey)
		expect(createPending.mock.calls[0][0].key).toBe(secondKey)
		expect(upload).toHaveBeenCalledWith(expect.objectContaining({ key: secondKey }))
	})

	it('falha com ServiceError se todas as tentativas colidem', async () => {
		const findByKey = jest.fn(async () => ({ id: 'existing' }))
		const { manager, upload } = createManager({ findByKey })

		await expect(
			manager.storeImage({
				buffer: Buffer.from('image-bytes'),
				mimeType: 'image/gif',
				ownerId: OWNER_ID,
			})
		).rejects.toBeInstanceOf(ServiceError)

		expect(findByKey).toHaveBeenCalledTimes(5)
		expect(upload).not.toHaveBeenCalled()
	})

	it('rejeita ownerId vazio', async () => {
		const { manager, upload } = createManager()

		await expect(
			manager.storeImage({
				buffer: Buffer.from('image-bytes'),
				mimeType: 'image/jpeg',
				ownerId: '',
			})
		).rejects.toBeInstanceOf(ValidationError)

		expect(upload).not.toHaveBeenCalled()
	})

	it('regenera a key quando createPending colide (P2002)', async () => {
		const createPending = jest
			.fn()
			.mockRejectedValueOnce(new ConflictError('Storage key already in use'))
			.mockResolvedValueOnce({ id: 'file-2' })
		const { manager, upload } = createManager({ createPending })

		const stored = await manager.storeImage({
			buffer: Buffer.from('image-bytes'),
			mimeType: 'image/jpeg',
			ownerId: OWNER_ID,
		})

		expect(createPending).toHaveBeenCalledTimes(2)
		expect(upload).toHaveBeenCalledTimes(1)
		expect(stored.fileId).toBe('file-2')
	})

	it('rejeita upload acima da cota de 1 GiB', async () => {
		const sumPublishedBytesByOwner = jest.fn(async () => USER_STORAGE_QUOTA_BYTES)
		const manager = new FileManager(
			{ upload: jest.fn(), buildPublicUrl: jest.fn() } as never,
			{
				findByKey: jest.fn(async () => null),
				createPending: jest.fn(),
				markPublished: jest.fn(),
				markFailed: jest.fn(),
				sumPublishedBytesByOwner,
			} as never
		)

		await expect(
			manager.storeImage({
				buffer: Buffer.from('x'),
				mimeType: 'image/jpeg',
				ownerId: OWNER_ID,
			})
		).rejects.toBeInstanceOf(ForbiddenError)
	})
})
