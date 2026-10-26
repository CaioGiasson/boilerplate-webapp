import type { Prisma } from '@prisma/client'
import { RepositoryError, ValidationError } from '@/errors'

export default class FeatureFlagRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	/** Valor do registro mais recente da chave, ou `null` quando a chave nunca foi gravada. */
	async findLatestValue(key: string): Promise<Prisma.JsonValue | null> {
		const normalizedKey = key.trim()
		if (!normalizedKey) return null

		try {
			const latest = await this.prisma.featureFlag.findFirst({
				where: { key: normalizedKey },
				orderBy: { createdAt: 'desc' },
				select: { value: true },
			})
			return latest ? latest.value : null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to read feature flag', error)
		}
	}

	/** Acrescenta um registro novo; o histórico anterior é mantido como trilha de auditoria. */
	async append(key: string, value: Prisma.InputJsonValue): Promise<void> {
		const normalizedKey = key.trim()
		if (!normalizedKey) {
			throw new ValidationError('Feature flag key is required')
		}

		try {
			await this.prisma.featureFlag.create({ data: { key: normalizedKey, value } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to write feature flag', error)
		}
	}
}
