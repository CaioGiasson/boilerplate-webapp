import type { StorageUploadInput, StorageUploadResult } from '@/services/Storage/Storage.service'

/**
 * Spaces/storage port (DI-04). Default adapter: `StorageService` via `getStorageService()`.
 */
export type StoragePort = {
	upload(input: StorageUploadInput): Promise<StorageUploadResult>
	deleteObject(key: string): Promise<void>
	getPresignedGetUrl(key: string, ttlSeconds: number): Promise<string>
	buildPublicUrl(key: string): string
	keyFromCanonicalUrl(canonicalUrl: string): string | null
}
