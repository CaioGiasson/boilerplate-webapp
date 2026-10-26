import { fetchApi, parseApiResponse } from '@/lib/api-error'

export type NotificationItem = {
	id: string
	type: string
	title: string
	text: string
	link: string | null
	read: boolean
	createdAt: string
}

export type NotificationsPage = {
	items: NotificationItem[]
	unreadCount: number
	nextCursor: string | null
}

export async function listNotificationsRequest(
	options: { cursor?: string; limit?: number } = {}
): Promise<NotificationsPage> {
	const params = new URLSearchParams()
	if (options.cursor) params.set('cursor', options.cursor)
	if (options.limit) params.set('limit', String(options.limit))
	const query = params.size > 0 ? `?${params.toString()}` : ''

	const response = await fetchApi(`/api/v1/notifications${query}`, { credentials: 'include' })
	return parseApiResponse<NotificationsPage>(response)
}

export async function markNotificationReadRequest(id: string): Promise<void> {
	const response = await fetchApi(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
		method: 'POST',
		credentials: 'include',
	})
	await parseApiResponse(response)
}

export async function markAllNotificationsReadRequest(): Promise<void> {
	const response = await fetchApi('/api/v1/notifications/read-all', { method: 'POST', credentials: 'include' })
	await parseApiResponse(response)
}
