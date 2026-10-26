import type { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'

export type CreateAiLogInput = {
	userId?: string
	contextId?: string
	query: string
	model: string
	prompt: string
	response: string
	tokenCost: number
}

export type AiLogRecord = {
	id: string
	userId: string | null
	contextId: string | null
	query: string
	model: string
	prompt: string
	response: string
	tokenCost: number
	createdAt: Date
}

/** Teto de linhas por exportação LGPD; a retenção (90 dias por padrão) mantém o volume baixo. */
export const AI_LOG_EXPORT_MAX_ROWS = 5000

export default class AiLogRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async create(input: CreateAiLogInput): Promise<void> {
		try {
			await this.prisma.aiLog.create({
				data: {
					userId: input.userId?.trim() || null,
					contextId: input.contextId?.trim() || null,
					query: input.query.trim(),
					model: input.model.trim(),
					prompt: input.prompt,
					response: input.response,
					tokenCost: Math.max(0, Math.floor(input.tokenCost)),
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to create AI log', error)
		}
	}

	async countByUserSince(input: { userId: string; query: string; since: Date }): Promise<number> {
		try {
			return await this.prisma.aiLog.count({
				where: { userId: input.userId, query: input.query, createdAt: { gte: input.since } },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to count AI logs', error)
		}
	}

	async sumTokensByUserSince(input: { userId: string; since: Date }): Promise<number> {
		try {
			const result = await this.prisma.aiLog.aggregate({
				where: { userId: input.userId, createdAt: { gte: input.since } },
				_sum: { tokenCost: true },
			})
			return result._sum.tokenCost ?? 0
		} catch (error: unknown) {
			throw new RepositoryError('Failed to sum AI log tokens', error)
		}
	}

	async listByUser(userId: string): Promise<AiLogRecord[]> {
		try {
			return await this.prisma.aiLog.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
				take: AI_LOG_EXPORT_MAX_ROWS,
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list AI logs', error)
		}
	}
}
