import { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'
import type { ExampleEntity } from '@/services/Example/Example.ports'

const DEFAULT_CACHE_LIFETIME_SECONDS = 21600

export default class ExampleRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async create(identifier: string, random: string): Promise<ExampleEntity | null> {
		try {
			const example = await this.prisma.example.create({
				data: {
					identifier,
					random,
					deletedAt: null,
				},
			})

			return example as ExampleEntity
		} catch (error: unknown) {
			throw new RepositoryError('Failed to create example', error)
		}
	}

	async recoverFromCache(identifier: string): Promise<ExampleEntity | null> {
		const cacheLifetimeSeconds = Number(process.env.CACHE_LIFETIME_SECONDS ?? DEFAULT_CACHE_LIFETIME_SECONDS)

		try {
			const example = await this.prisma.example.findFirst({
				where: {
					identifier,
					OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
					createdAt: {
						gte: new Date(Date.now() - cacheLifetimeSeconds * 1000),
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
			})

			return example as ExampleEntity | null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to recover example from cache', error)
		}
	}
}
