import type { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'

export type PushSubscriptionRecord = {
	id: string
	userId: string
	endpoint: string
	p256dh: string
	auth: string
	createdAt: Date
}

export type UpsertPushSubscriptionInput = {
	userId: string
	endpoint: string
	p256dh: string
	auth: string
}

export const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 10

export default class PushSubscriptionRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	/**
	 * O `endpoint` é único no navegador: se outra conta se inscrever no mesmo aparelho, a assinatura passa para ela
	 * (o aparelho deixa de receber push da conta anterior).
	 */
	async upsertByEndpoint(input: UpsertPushSubscriptionInput): Promise<void> {
		try {
			await this.prisma.pushSubscription.upsert({
				where: { endpoint: input.endpoint },
				create: input,
				update: { userId: input.userId, p256dh: input.p256dh, auth: input.auth },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to save push subscription', error)
		}
	}

	async listByUser(userId: string): Promise<PushSubscriptionRecord[]> {
		try {
			return await this.prisma.pushSubscription.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list push subscriptions', error)
		}
	}

	async countByUser(userId: string): Promise<number> {
		try {
			return await this.prisma.pushSubscription.count({ where: { userId } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to count push subscriptions', error)
		}
	}

	/** Remove só se a assinatura for do usuário (cancelar não pode apagar a de outra conta). */
	async deleteByEndpoint(input: { userId: string; endpoint: string }): Promise<number> {
		try {
			const result = await this.prisma.pushSubscription.deleteMany({
				where: { endpoint: input.endpoint, userId: input.userId },
			})
			return result.count
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete push subscription', error)
		}
	}

	/** Limpeza quando o serviço de push responde 404/410 (assinatura expirada). */
	async deleteExpiredByEndpoint(endpoint: string): Promise<void> {
		try {
			await this.prisma.pushSubscription.deleteMany({ where: { endpoint } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete expired push subscription', error)
		}
	}
}
