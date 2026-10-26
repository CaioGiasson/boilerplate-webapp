import { randomBytes } from 'crypto'
import { ConflictError, ForbiddenError, ServiceError, ValidationError } from '@/errors'
import { USER_STORAGE_QUOTA_BYTES } from '@/constants/storageQuota'
import FileRepository from '@/repositories/File.repository'
import { SharpImageProcessor, type ImageProcessorPort, type ImageVariant } from '@/services/Storage/imageProcessor'
import { getStorageService } from '@/services/Storage/Storage.service'
import type { StoragePort } from '@/services/Storage/storage.port'
import type { Prisma } from '@prisma/client'

const AVATAR_CATEGORY = 'avatars'
const IMAGE_CATEGORY = 'images'
const KEY_ALLOCATION_ATTEMPTS = 5
const OUTPUT_EXTENSION = 'webp'
const THUMBNAIL_KEY_SUFFIX = '.thumb.webp'

export type StoredImage = {
	url: string
	thumbnailUrl: string
	fileId: string
}

/** Chave do thumbnail derivada da chave principal: nunca colide, pois a principal é única. */
export function thumbnailKeyFor(key: string): string {
	return key.replace(/\.webp$/, THUMBNAIL_KEY_SUFFIX)
}

export default class FileManager {
	constructor(
		private storageService: StoragePort,
		private fileRepository: FileRepository,
		private imageProcessor: ImageProcessorPort = new SharpImageProcessor()
	) {}

	static create(
		prisma: Prisma.TransactionClient,
		storage: StoragePort = getStorageService(),
		imageProcessor?: ImageProcessorPort
	): FileManager {
		return new FileManager(storage, new FileRepository(prisma), imageProcessor)
	}

	/**
	 * Normaliza (WebP quadrado), gera thumbnail, faz upload e publica o avatar. Não marca o anterior como orphan —
	 * isso só deve acontecer depois que o User.photoUrl for atualizado com sucesso.
	 */
	async storeAvatar(input: { buffer: Buffer; ownerId: string }): Promise<StoredImage> {
		return this.storeObject({ ...input, category: AVATAR_CATEGORY, variant: 'avatar' })
	}

	/** Upload de imagem de galeria (WebP, até 1600 px) com thumbnail; retorna URLs e id do File. */
	async storeImage(input: { buffer: Buffer; ownerId: string }): Promise<StoredImage> {
		return this.storeObject({ ...input, category: IMAGE_CATEGORY, variant: 'image' })
	}

	private async allocateUniqueKey(ownerId: string, category: string): Promise<string> {
		for (let attempt = 0; attempt < KEY_ALLOCATION_ATTEMPTS; attempt++) {
			const suffix = randomBytes(16).toString('hex')
			const key = `${ownerId}/${category}/${suffix}.${OUTPUT_EXTENSION}`
			const existing = await this.fileRepository.findByKey(key)
			if (!existing) {
				return key
			}
		}

		throw new ServiceError('Failed to allocate a unique storage key')
	}

	private async storeObject(input: {
		buffer: Buffer
		ownerId: string
		category: string
		variant: ImageVariant
	}): Promise<StoredImage> {
		if (!input.ownerId) {
			throw new ValidationError('ownerId is required')
		}

		const processed = await this.imageProcessor.process(input.buffer, input.variant)
		const sizeBytes = processed.main.byteLength + processed.thumbnail.byteLength

		const used = await this.fileRepository.sumPublishedBytesByOwner(input.ownerId)
		if (used + sizeBytes > USER_STORAGE_QUOTA_BYTES) {
			throw new ForbiddenError('Storage quota exceeded')
		}

		for (let attempt = 0; attempt < KEY_ALLOCATION_ATTEMPTS; attempt++) {
			const key = await this.allocateUniqueKey(input.ownerId, input.category)
			const thumbnailKey = thumbnailKeyFor(key)
			const url = this.storageService.buildPublicUrl(key)
			const thumbnailUrl = this.storageService.buildPublicUrl(thumbnailKey)

			try {
				const pending = await this.fileRepository.createPending({
					key,
					url,
					thumbnailKey,
					thumbnailUrl,
					category: input.category,
					mimeType: processed.mimeType,
					sizeBytes,
					ownerId: input.ownerId,
				})

				try {
					const uploaded = await this.storageService.upload({
						key,
						buffer: processed.main,
						contentType: processed.mimeType,
					})
					try {
						const uploadedThumbnail = await this.storageService.upload({
							key: thumbnailKey,
							buffer: processed.thumbnail,
							contentType: processed.mimeType,
						})
						await this.fileRepository.markPublished(pending.id)
						return { url: uploaded.url, thumbnailUrl: uploadedThumbnail.url, fileId: pending.id }
					} catch (error: unknown) {
						// Sem o thumbnail o par fica incompleto: não deixa o objeto principal órfão no bucket.
						await this.storageService.deleteObject(key).catch(() => undefined)
						throw error
					}
				} catch (error: unknown) {
					await this.fileRepository.markFailed(pending.id)
					throw error
				}
			} catch (error: unknown) {
				if (error instanceof ConflictError && attempt < KEY_ALLOCATION_ATTEMPTS - 1) {
					continue
				}
				throw error
			}
		}

		throw new ServiceError('Failed to allocate a unique storage key')
	}

	async orphanByUrl(url: string): Promise<void> {
		await this.fileRepository.markOrphanByUrl(url)
	}

	async deletePublishedByFileId(fileId: string): Promise<void> {
		const file = await this.fileRepository.findById(fileId)
		if (!file) {
			return
		}
		await this.deleteObjects(file)
		await this.fileRepository.markOrphanByUrl(file.url)
	}

	/**
	 * Apaga no Spaces todos os objetos ainda rastreáveis do dono (published, orphan, pending, failed)
	 * e marca cada File como orphan. Usar cliente Prisma raiz (fora da TX do use case).
	 */
	async deleteAllOwnedObjectsByOwner(ownerId: string): Promise<void> {
		const files = await this.fileRepository.listOwnedForErasure(ownerId)
		for (const file of files) {
			await this.deleteObjects(file)
			await this.fileRepository.markOrphanById(file.id)
		}
	}

	/** Apaga o objeto principal e, quando existir, o thumbnail (arquivos legados não têm). */
	private async deleteObjects(file: { key: string; thumbnailKey?: string | null }): Promise<void> {
		await this.storageService.deleteObject(file.key)
		if (file.thumbnailKey) {
			await this.storageService.deleteObject(file.thumbnailKey)
		}
	}
}
