import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import NotificationRepository, {
	NOTIFICATIONS_MAX_PAGE_SIZE,
	NOTIFICATIONS_PAGE_SIZE,
} from '@/repositories/Notification.repository'

type Input = {
	userId: string
	/** `createdAt` ISO da última notificação já carregada. */
	before?: string
	limit?: number
}

export type NotificationDto = {
	id: string
	type: string
	title: string
	text: string
	link: string | null
	read: boolean
	createdAt: string
}

type Output = {
	items: NotificationDto[]
	unreadCount: number
	/** Passe em `before` para a próxima página; `null` quando acabou. */
	nextBefore: string | null
}

export default class ListNotifications extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (input.before !== undefined && Number.isNaN(new Date(input.before).getTime())) {
			throw new ValidationError('before must be an ISO date')
		}
		if (
			input.limit !== undefined &&
			(!Number.isInteger(input.limit) || input.limit < 1 || input.limit > NOTIFICATIONS_MAX_PAGE_SIZE)
		) {
			throw new ValidationError(`limit must be between 1 and ${NOTIFICATIONS_MAX_PAGE_SIZE}`)
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const repository = new NotificationRepository(injectables.prisma)
		const limit = input.limit ?? NOTIFICATIONS_PAGE_SIZE

		// Uma a mais que o limite diz se há próxima página sem uma segunda consulta.
		const rows = await repository.listByUser({
			userId: input.userId,
			before: input.before ? new Date(input.before) : undefined,
			limit: limit + 1,
		})
		const page = rows.slice(0, limit)
		const unreadCount = await repository.countUnread(input.userId)

		return {
			items: page.map((row) => ({
				id: row.id,
				type: row.type,
				title: row.title,
				text: row.text,
				link: row.link,
				read: row.readAt !== null,
				createdAt: row.createdAt.toISOString(),
			})),
			unreadCount,
			nextBefore: rows.length > limit ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
		}
	}
}
