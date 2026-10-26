import type { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'

export type NotificationRecord = {
	id: string
	userId: string
	type: string
	title: string
	text: string
	link: string | null
	readAt: Date | null
	createdAt: Date
}

export type NotificationCursor = {
	createdAt: Date
	id: string
}

export type CreateNotificationInput = {
	userId: string
	type: string
	title: string
	text: string
	link?: string
}

export const NOTIFICATIONS_PAGE_SIZE = 20
export const NOTIFICATIONS_MAX_PAGE_SIZE = 50

export default class NotificationRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async create(input: CreateNotificationInput): Promise<NotificationRecord> {
		try {
			return await this.prisma.notification.create({
				data: {
					userId: input.userId,
					type: input.type,
					title: input.title,
					text: input.text,
					link: input.link ?? null,
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to create notification', error)
		}
	}

	/**
	 * Mais recentes primeiro. `before` é o cursor (`createdAt` + `id` da última linha vista): o desempate por `id`
	 * evita pular notificações criadas no mesmo instante (envio em lote) na virada de página.
	 */
	async listByUser(input: {
		userId: string
		before?: NotificationCursor
		limit: number
	}): Promise<NotificationRecord[]> {
		try {
			const { before } = input
			return await this.prisma.notification.findMany({
				where: {
					userId: input.userId,
					...(before
						? {
								OR: [
									{ createdAt: { lt: before.createdAt } },
									{ createdAt: before.createdAt, id: { lt: before.id } },
								],
							}
						: {}),
				},
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				take: input.limit,
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list notifications', error)
		}
	}

	async countUnread(userId: string): Promise<number> {
		try {
			return await this.prisma.notification.count({
				where: { userId, OR: [{ readAt: null }, { readAt: { isSet: false } }] },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to count unread notifications', error)
		}
	}

	/** Só marca se a notificação for do usuário; devolve `false` quando não existe ou é de outro dono. */
	async markRead(input: { id: string; userId: string; at: Date }): Promise<boolean> {
		try {
			const result = await this.prisma.notification.updateMany({
				where: { id: input.id, userId: input.userId, OR: [{ readAt: null }, { readAt: { isSet: false } }] },
				data: { readAt: input.at },
			})
			if (result.count > 0) return true

			const existing = await this.prisma.notification.findFirst({
				where: { id: input.id, userId: input.userId },
				select: { id: true },
			})
			return existing !== null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark notification as read', error)
		}
	}

	async markAllRead(input: { userId: string; at: Date }): Promise<number> {
		try {
			const result = await this.prisma.notification.updateMany({
				where: { userId: input.userId, OR: [{ readAt: null }, { readAt: { isSet: false } }] },
				data: { readAt: input.at },
			})
			return result.count
		} catch (error: unknown) {
			throw new RepositoryError('Failed to mark all notifications as read', error)
		}
	}

	/** Exportação LGPD: todas as notificações do titular. */
	async listAllByUser(userId: string): Promise<NotificationRecord[]> {
		try {
			return await this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list notifications for export', error)
		}
	}
}
