import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import NotificationRepository, {
	NOTIFICATIONS_MAX_PAGE_SIZE,
	NOTIFICATIONS_PAGE_SIZE,
	type NotificationCursor,
} from '@/repositories/Notification.repository'

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i
const CURSOR_SEPARATOR = '_'

/** Cursor opaco para o cliente: `<createdAt ISO>_<id>`. */
export function encodeNotificationCursor(cursor: NotificationCursor): string {
	return `${cursor.createdAt.toISOString()}${CURSOR_SEPARATOR}${cursor.id}`
}

export function parseNotificationCursor(raw: string): NotificationCursor | null {
	const separatorIndex = raw.lastIndexOf(CURSOR_SEPARATOR)
	if (separatorIndex < 0) return null
	const createdAt = new Date(raw.slice(0, separatorIndex))
	const id = raw.slice(separatorIndex + 1)
	if (Number.isNaN(createdAt.getTime()) || !OBJECT_ID_PATTERN.test(id)) return null
	return { createdAt, id }
}

type Input = {
	userId: string
	/** `nextCursor` da página anterior. */
	cursor?: string
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
	/** Passe em `cursor` para a próxima página; `null` quando acabou. */
	nextCursor: string | null
}

export default class ListNotifications extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (input.cursor !== undefined && parseNotificationCursor(input.cursor) === null) {
			throw new ValidationError('cursor is invalid')
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
			before: input.cursor ? (parseNotificationCursor(input.cursor) ?? undefined) : undefined,
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
			nextCursor: rows.length > limit && page.length > 0 ? encodeNotificationCursor(page[page.length - 1]) : null,
		}
	}
}
