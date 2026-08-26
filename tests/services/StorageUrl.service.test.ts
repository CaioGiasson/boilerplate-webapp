import StorageService from '@/services/Storage/Storage.service'
import { Visibility } from '@/constants/visibility'
import StorageUrlService, { PresignedUrlCache } from '@/services/Storage/StorageUrl.service'
import { STORAGE_PRESIGN_TTL_PRIVATE_SECONDS, STORAGE_PRESIGN_TTL_PUBLIC_SECONDS } from '@/constants/storageAccess'

function mockStorage(presign: jest.Mock, key: string | null = 'owner/images/abc.jpg') {
	return {
		keyFromCanonicalUrl: jest.fn(() => key),
		getPresignedGetUrl: presign,
	} as unknown as StorageService
}

describe('StorageUrlService', () => {
	it('presigns PUBLIC images with public TTL', async () => {
		const presign = jest.fn(async () => 'https://signed.example/object')
		const service = new StorageUrlService(mockStorage(presign, 'owner/images/abc.jpg'))
		const url = await service.presignImageUrl('https://cdn.example/owner/images/abc.jpg', Visibility.PUBLIC)

		expect(url).toBe('https://signed.example/object')
		expect(presign).toHaveBeenCalledWith('owner/images/abc.jpg', STORAGE_PRESIGN_TTL_PUBLIC_SECONDS)
	})

	it('presigns PRIVATE images with private TTL', async () => {
		const presign = jest.fn(async () => 'https://signed.example/private')
		const service = new StorageUrlService(mockStorage(presign, 'owner/images/secret.jpg'))
		await service.presignImageUrl('https://cdn.example/owner/images/secret.jpg', Visibility.PRIVATE)

		expect(presign).toHaveBeenCalledWith('owner/images/secret.jpg', STORAGE_PRESIGN_TTL_PRIVATE_SECONDS)
	})

	it('presigns SECRET images with private TTL', async () => {
		const presign = jest.fn(async () => 'https://signed.example/secret')
		const service = new StorageUrlService(mockStorage(presign, 'owner/images/top-secret.jpg'))
		await service.presignImageUrl('https://cdn.example/owner/images/top-secret.jpg', Visibility.SECRET)

		expect(presign).toHaveBeenCalledWith('owner/images/top-secret.jpg', STORAGE_PRESIGN_TTL_PRIVATE_SECONDS)
	})

	it('returns the original URL when the key cannot be derived (non-Spaces)', async () => {
		const presign = jest.fn()
		const service = new StorageUrlService(mockStorage(presign, null))
		const url = await service.presignImageUrl('https://external.example/photo.jpg', Visibility.PRIVATE)

		expect(url).toBe('https://external.example/photo.jpg')
		expect(presign).not.toHaveBeenCalled()
	})

	it('caches presigned URLs within TTL (DATA-07)', async () => {
		const presign = jest.fn(async () => 'https://signed.example/cached')
		const cache = new PresignedUrlCache(() => 1_000_000)
		const service = new StorageUrlService(mockStorage(presign, 'owner/images/cache.jpg'), cache)
		const canonical = 'https://cdn.example/owner/images/cache.jpg'

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
