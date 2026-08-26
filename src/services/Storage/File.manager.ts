import { randomBytes } from 'crypto'
import { ConflictError, ForbiddenError, ServiceError, ValidationError } from '@/errors'
import { USER_STORAGE_QUOTA_BYTES } from '@/constants/storageQuota'
import FileRepository from '@/repositories/File.repository'
import { getStorageService } from '@/services/Storage/Storage.service'
import type { StoragePort } from '@/services/Storage/storage.port'
import type { Prisma } from '@prisma/client'

const AVATAR_CATEGORY = 'avatars'
const IMAGE_CATEGORY = 'images'
const KEY_ALLOCATION_ATTEMPTS = 5

export default class FileManager {
	constructor(
		private storageService: StoragePort,
		private fileRepository: FileRepository
	) {}

	static create(prisma: Prisma.TransactionClient, storage: StoragePort = getStorageService()): FileManager {
		return new FileManager(storage, new FileRepository(prisma))
	}

	/**
	 * Faz upload e publica o avatar. Não marca o anterior como orphan —
	 * isso só deve acontecer depois que o User.photoUrl for atualizado com sucesso.
	 */
	async storeAvatar(input: { buffer: Buffer; mimeType: string; ownerId: string }): Promise<string> {
		const stored = await this.storeObject({
			...input,
			category: AVATAR_CATEGORY,
		})
		return stored.url
	}

	/** Upload de imagem de galeria; retorna URL pública e id do File. */
	async storeImage(input: {
		buffer: Buffer
		mimeType: string
		ownerId: string
	}): Promise<{ url: string; fileId: string }> {
		return this.storeObject({
			...input,
			category: IMAGE_CATEGORY,
		})
	}

	private async allocateUniqueKey(ownerId: string, category: string, extension: string): Promise<string> {
		for (let attempt = 0; attempt < KEY_ALLOCATION_ATTEMPTS; attempt++) {
			const suffix = randomBytes(16).toString('hex')
			const key = `${ownerId}/${category}/${suffix}.${extension}`
			const existing = await this.fileRepository.findByKey(key)
			if (!existing) {
				return key
			}
		}

		throw new ServiceError('Failed to allocate a unique storage key')
	}

	private async storeObject(input: {
		buffer: Buffer
		mimeType: string
		ownerId: string
		category: string
	}): Promise<{ url: string; fileId: string }> {
		if (!input.ownerId) {
			throw new ValidationError('ownerId is required')
		}

		const extension = extensionFromMime(input.mimeType)
		const used = await this.fileRepository.sumPublishedBytesByOwner(input.ownerId)
		if (used + input.buffer.byteLength > USER_STORAGE_QUOTA_BYTES) {
			throw new ForbiddenError('Storage quota exceeded')
		}

		for (let attempt = 0; attempt < KEY_ALLOCATION_ATTEMPTS; attempt++) {
			const key = await this.allocateUniqueKey(input.ownerId, input.category, extension)
			const url = this.storageService.buildPublicUrl(key)

			try {
				const pending = await this.fileRepository.createPending({
					key,
					url,
					category: input.category,
					mimeType: input.mimeType,
					sizeBytes: input.buffer.byteLength,
					ownerId: input.ownerId,
				})

				try {
					const uploaded = await this.storageService.upload({
						key,
						buffer: input.buffer,
						contentType: input.mimeType,
					})
					await this.fileRepository.markPublished(pending.id)
					return { url: uploaded.url, fileId: pending.id }
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
		await this.storageService.deleteObject(file.key)
		await this.fileRepository.markOrphanByUrl(file.url)
	}

	/**
	 * Apaga no Spaces todos os objetos ainda rastreáveis do dono (published, orphan, pending, failed)
	 * e marca cada File como orphan. Usar cliente Prisma raiz (fora da TX do use case).
	 */
	async deleteAllOwnedObjectsByOwner(ownerId: string): Promise<void> {
		const files = await this.fileRepository.listOwnedForErasure(ownerId)
		for (const file of files) {
			await this.storageService.deleteObject(file.key)
			await this.fileRepository.markOrphanById(file.id)
		}
	}
}

function extensionFromMime(mimeType: string): string {
	switch (mimeType) {
		case 'image/jpeg':
			return 'jpg'
		case 'image/png':
			return 'png'
		case 'image/webp':
			return 'webp'
		case 'image/gif':
			return 'gif'
		default:
			return 'bin'
	}
}
