import StorageService from '@/services/Storage/Storage.service'
import StorageUrlService, { PresignedUrlCache } from '@/services/Storage/StorageUrl.service'
import { STORAGE_PRESIGN_TTL_AVATAR_SECONDS, STORAGE_PRESIGN_TTL_PRIVATE_SECONDS } from '@/constants/storageAccess'

function mockStorage(presign: jest.Mock, key: string | null = 'owner/avatars/abc.jpg') {
	return {
		keyFromCanonicalUrl: jest.fn(() => key),
		getPresignedGetUrl: presign,
	} as unknown as StorageService
}

describe('StorageUrlService', () => {
	it('presigns private files with private TTL', async () => {
		const presign = jest.fn(async () => 'https://signed.example/private')
		const service = new StorageUrlService(mockStorage(presign, 'owner/files/doc.pdf'))
		await service.presignPrivateUrl('https://cdn.example/owner/files/doc.pdf')

		expect(presign).toHaveBeenCalledWith('owner/files/doc.pdf', STORAGE_PRESIGN_TTL_PRIVATE_SECONDS)
	})

	it('presigns avatars with avatar TTL', async () => {
		const presign = jest.fn(async () => 'https://signed.example/avatar')
		const service = new StorageUrlService(mockStorage(presign, 'owner/avatars/photo.jpg'))
		await service.presignAvatarUrl('https://cdn.example/owner/avatars/photo.jpg')

		expect(presign).toHaveBeenCalledWith('owner/avatars/photo.jpg', STORAGE_PRESIGN_TTL_AVATAR_SECONDS)
	})

	it('returns the original URL when the key cannot be derived (non-Spaces)', async () => {
		const presign = jest.fn()
		const service = new StorageUrlService(mockStorage(presign, null))
		const url = await service.presignPrivateUrl('https://external.example/photo.jpg')

		expect(url).toBe('https://external.example/photo.jpg')
		expect(presign).not.toHaveBeenCalled()
	})

	it('caches presigned URLs within TTL (DATA-07)', async () => {
		const presign = jest.fn(async () => 'https://signed.example/cached')
		const cache = new PresignedUrlCache(() => 1_000_000)
		const service = new StorageUrlService(mockStorage(presign, 'owner/avatars/cache.jpg'), cache)
		const canonical = 'https://cdn.example/owner/avatars/cache.jpg'

		await service.presignCanonicalUrl(canonical, 3600, 'file-abc')
		await service.presignCanonicalUrl(canonical, 3600, 'file-abc')

		expect(presign).toHaveBeenCalledTimes(1)
	})
})

describe('StorageService upload contract', () => {
	it('PutObject must not include public-read ACL (checked via source)', () => {
		const source = jest.requireActual('@/services/Storage/Storage.service') as { default: typeof StorageService }
		const fn = source.default.prototype.upload.toString()
		expect(fn).not.toContain('public-read')
	})
})
