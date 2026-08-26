import { FileStatus, Prisma } from '@prisma/client'
import { ConflictError, RepositoryError } from '@/errors'

export default class FileRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async findByKey(key: string) {
		try {
			return await this.prisma.file.findUnique({
				where: { key },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find file by key', error)
		}
	}

	async createPending(input: {
		key: string
		url: string
		category: string
		mimeType: string
		sizeBytes: number
		ownerId?: string
	}) {
		try {
			return await this.prisma.file.create({
				data: {
					key: input.key,
					url: input.url,
					category: input.category,
					mimeType: input.mimeType,
					sizeBytes: input.sizeBytes,
					ownerId: input.ownerId,
					status: FileStatus.pending,
				},
			})
		} catch (error: unknown) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('Storage key already in use')
			}
			throw new RepositoryError('Failed to create file record', error)
		}
	}

	async markPublished(id: string): Promise<void> {
		try {
			await this.prisma.file.update({
				where: { id },
				data: { status: FileStatus.published },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark file as published', error)
		}
	}

	async markFailed(id: string): Promise<void> {
		try {
			await this.prisma.file.update({
				where: { id },
				data: { status: FileStatus.failed },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark file as failed', error)
		}
	}

	async markOrphanByUrl(url: string): Promise<void> {
		try {
			await this.prisma.file.updateMany({
				where: { url, status: FileStatus.published },
				data: { status: FileStatus.orphan },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark file as orphan', error)
		}
	}

	async findById(id: string) {
		try {
			return await this.prisma.file.findUnique({ where: { id } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find file by id', error)
		}
	}

	async listPublishedByOwner(ownerId: string) {
		try {
			return await this.prisma.file.findMany({
				where: { ownerId, status: FileStatus.published },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list published files by owner', error)
		}
	}

	/** Arquivos do dono que ainda podem ter objeto no Spaces (inclui orphan de avatar antigo). */
	async listOwnedForErasure(ownerId: string) {
		try {
			return await this.prisma.file.findMany({
				where: {
					ownerId,
					status: {
						in: [FileStatus.published, FileStatus.orphan, FileStatus.pending, FileStatus.failed],
					},
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list owned files for erasure', error)
		}
	}

	async markOrphanById(id: string): Promise<void> {
		try {
			await this.prisma.file.update({
				where: { id },
				data: { status: FileStatus.orphan },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark file as orphan by id', error)
		}
	}

	async countPublishedByOwner(ownerId: string): Promise<number> {
		try {
			return await this.prisma.file.count({
				where: { ownerId, status: FileStatus.published },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to count published files by owner', error)
		}
	}

	async sumPublishedBytesByOwner(ownerId: string): Promise<number> {
		try {
			const result = await this.prisma.file.aggregate({
				where: { ownerId, status: FileStatus.published },
				_sum: { sizeBytes: true },
			})
			return result._sum.sizeBytes ?? 0
		} catch (error: unknown) {
			throw new RepositoryError('Failed to sum storage usage', error)
		}
	}
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'
	)
}
