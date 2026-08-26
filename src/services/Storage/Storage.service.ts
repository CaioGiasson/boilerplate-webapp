import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StoragePort } from '@/services/Storage/storage.port'
import { getStorageConfig, type StorageConfig } from '@/config/env'
import { ServiceError } from '@/errors'
import LogManager from '@/managers/Log.manager'
import { spacesCircuitBreaker } from '@/services/resilience/externalBreakers'
import { isRetryableHttpStatus, retryWithJitter } from '@/utils/retryWithJitter'

export type StorageUploadInput = {
	key: string
	buffer: Buffer
	contentType: string
}

export type StorageUploadResult = {
	key: string
	url: string
}

/**
 * Adapter S3-compatible para DigitalOcean Spaces.
 */
export default class StorageService {
	private client: { send(command: unknown): Promise<unknown> } | null = null
	private s3Module: typeof import('@aws-sdk/client-s3') | null = null
	private config: StorageConfig

	constructor(config: StorageConfig = getStorageConfig()) {
		this.config = config
	}

	buildPublicUrl(key: string): string {
		return `${this.config.spacesPublicBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
	}

	keyFromCanonicalUrl(canonicalUrl: string): string | null {
		const trimmed = canonicalUrl.trim()
		if (!trimmed) {
			return null
		}

		const base = this.config.spacesPublicBaseUrl.replace(/\/$/, '')
		if (trimmed.startsWith(`${base}/`)) {
			return trimmed.slice(base.length + 1)
		}

		try {
			const parsed = new URL(trimmed)
			const pathname = parsed.pathname.replace(/^\//, '')
			return pathname || null
		} catch {
			return null
		}
	}

	async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
		const { PutObjectCommand } = await this.getS3Module()
		const client = await this.getClient()

		try {
			await this.runWithResilience('upload', () =>
				client.send(
					new PutObjectCommand({
						Bucket: this.config.spacesBucket,
						Key: input.key,
						Body: input.buffer,
						ContentType: input.contentType,
					})
				)
			)
		} catch (error: unknown) {
			LogManager.error('Storage upload failed', error)
			throw new ServiceError('Failed to upload file to storage', error)
		}

		return {
			key: input.key,
			url: this.buildPublicUrl(input.key),
		}
	}

	async getPresignedGetUrl(key: string, ttlSeconds: number): Promise<string> {
		const { GetObjectCommand } = await this.getS3Module()
		const client = await this.getClient()

		try {
			return await this.runWithResilience('presign', () =>
				getSignedUrl(
					client as never,
					new GetObjectCommand({
						Bucket: this.config.spacesBucket,
						Key: key,
					}),
					{ expiresIn: ttlSeconds }
				)
			)
		} catch (error: unknown) {
			LogManager.error('Storage presign failed', error)
			throw new ServiceError('Failed to presign storage URL', error)
		}
	}

	async setObjectAclPrivate(key: string): Promise<void> {
		const { PutObjectAclCommand } = await this.getS3Module()
		const client = await this.getClient()

		try {
			await this.runWithResilience('setAcl', () =>
				client.send(
					new PutObjectAclCommand({
						Bucket: this.config.spacesBucket,
						Key: key,
						ACL: 'private',
					})
				)
			)
		} catch (error: unknown) {
			LogManager.error('Storage ACL update failed', error)
			throw new ServiceError('Failed to set object ACL to private', error)
		}
	}

	async listObjectKeys(): Promise<string[]> {
		const { ListObjectsV2Command } = await this.getS3Module()
		const client = await this.getClient()
		const keys: string[] = []
		let continuationToken: string | undefined

		do {
			const response = (await client.send(
				new ListObjectsV2Command({
					Bucket: this.config.spacesBucket,
					ContinuationToken: continuationToken,
				})
			)) as { Contents?: { Key?: string }[]; IsTruncated?: boolean; NextContinuationToken?: string }

			for (const item of response.Contents ?? []) {
				if (item.Key) {
					keys.push(item.Key)
				}
			}

			continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
		} while (continuationToken)

		return keys
	}

	async deleteObject(key: string): Promise<void> {
		const { DeleteObjectCommand } = await this.getS3Module()
		const client = await this.getClient()

		try {
			await this.runWithResilience('delete', () =>
				client.send(
					new DeleteObjectCommand({
						Bucket: this.config.spacesBucket,
						Key: key,
					})
				)
			)
		} catch (error: unknown) {
			LogManager.error('Storage delete failed', error)
			throw new ServiceError('Failed to delete file from storage', error)
		}
	}

	private async runWithResilience<T>(operation: string, fn: () => Promise<T>): Promise<T> {
		return spacesCircuitBreaker.execute(() =>
			retryWithJitter(fn, {
				shouldRetry: (error) => isRetryableSpacesError(error),
				onRetry: (_error, attempt, delayMs) => {
					LogManager.info('Retrying Spaces operation', { operation, attempt, delayMs })
				},
			})
		)
	}

	private async getS3Module() {
		if (!this.s3Module) {
			this.s3Module = await import('@aws-sdk/client-s3')
		}
		return this.s3Module
	}

	private async getClient() {
		if (!this.client) {
			const { S3Client } = await this.getS3Module()
			this.client = new S3Client({
				endpoint: `https://${this.config.spacesEndpoint}`,
				region: 'us-east-1',
				credentials: {
					accessKeyId: this.config.spacesAccessKeyId,
					secretAccessKey: this.config.spacesSecretAccessKey,
				},
				forcePathStyle: false,
			})
		}
		return this.client
	}
}

function isRetryableSpacesError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false
	}

	const record = error as { $metadata?: { httpStatusCode?: number }; name?: string }
	const status = record.$metadata?.httpStatusCode
	if (typeof status === 'number') {
		return isRetryableHttpStatus(status)
	}

	// Transient network / throttling errors from AWS SDK
	const name = record.name ?? ''
	return name === 'TimeoutError' || name === 'RequestTimeout' || name === 'NetworkingError'
}

let sharedStorageService: StorageService | undefined

/** Process-wide Spaces adapter (reuses lazy S3 client). Prefer over `new` per upload. */
export function getStorageService(): StoragePort {
	if (!sharedStorageService) {
		sharedStorageService = new StorageService()
	}
	return sharedStorageService
}

/** Test hook — reset or inject a stub between cases. */
export function setStorageServiceForTests(service: StoragePort | undefined): void {
	sharedStorageService = service as StorageService | undefined
}
