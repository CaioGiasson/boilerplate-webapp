import {
	STORAGE_PRESIGN_CACHE_SKEW_SECONDS,
	STORAGE_PRESIGN_TTL_AVATAR_SECONDS,
	STORAGE_PRESIGN_TTL_PRIVATE_SECONDS,
} from '@/constants/storageAccess'
import type { PublicUser } from '@/repositories/User.repository'
import type { StoragePort } from '@/services/Storage/storage.port'
import { getStorageService } from '@/services/Storage/Storage.service'

type PresignCacheEntry = {
	url: string
	expiresAt: number
}

export class PresignedUrlCache {
	private readonly entries = new Map<string, PresignCacheEntry>()
	private readonly now: () => number

	constructor(now: () => number = Date.now) {
		this.now = now
	}

	clear(): void {
		this.entries.clear()
	}

	get(key: string): string | null {
		const entry = this.entries.get(key)
		if (!entry) {
			return null
		}
		if (entry.expiresAt <= this.now()) {
			this.entries.delete(key)
			return null
		}
		return entry.url
	}

	set(key: string, url: string, ttlSeconds: number, skewSeconds = STORAGE_PRESIGN_CACHE_SKEW_SECONDS): void {
		const expiresAt = this.now() + Math.max(0, ttlSeconds - skewSeconds) * 1000
		this.entries.set(key, { url, expiresAt })
	}
}

const defaultPresignCache = new PresignedUrlCache()

export function resetPresignedUrlCacheForTests(): void {
	defaultPresignCache.clear()
}

export function presignCacheKey(canonicalUrl: string, ttlSeconds: number, fileId?: string | null): string {
	if (fileId?.trim()) {
		return `file:${fileId.trim()}:${ttlSeconds}`
	}
	return `url:${canonicalUrl}:${ttlSeconds}`
}

export default class StorageUrlService {
	constructor(
		private readonly storageService: StoragePort = getStorageService(),
		private readonly presignCache: PresignedUrlCache = defaultPresignCache
	) {}

	async presignPrivateUrl(canonicalUrl: string, fileId?: string | null): Promise<string> {
		return this.presignCanonicalUrl(canonicalUrl, STORAGE_PRESIGN_TTL_PRIVATE_SECONDS, fileId)
	}

	async presignAvatarUrl(canonicalUrl: string): Promise<string> {
		return this.presignCanonicalUrl(canonicalUrl, STORAGE_PRESIGN_TTL_AVATAR_SECONDS)
	}

	async presignCanonicalUrl(canonicalUrl: string, ttlSeconds: number, fileId?: string | null): Promise<string> {
		const key = this.storageService.keyFromCanonicalUrl(canonicalUrl)
		if (!key) {
			return canonicalUrl
		}

		const cacheKey = presignCacheKey(canonicalUrl, ttlSeconds, fileId)
		const cached = this.presignCache.get(cacheKey)
		if (cached) {
			return cached
		}

		const url = await this.storageService.getPresignedGetUrl(key, ttlSeconds)
		this.presignCache.set(cacheKey, url, ttlSeconds)
		return url
	}

	async withSignedPublicUser(user: PublicUser): Promise<PublicUser> {
		if (!user.photoUrl) {
			return user
		}

		return {
			...user,
			photoUrl: await this.presignAvatarUrl(user.photoUrl),
		}
	}
}

let sharedStorageUrlService: StorageUrlService | undefined

export function getStorageUrlService(): StorageUrlService {
	if (!sharedStorageUrlService) {
		sharedStorageUrlService = new StorageUrlService()
	}
	return sharedStorageUrlService
}

export function setStorageUrlServiceForTests(service: StorageUrlService | undefined): void {
	sharedStorageUrlService = service
}
