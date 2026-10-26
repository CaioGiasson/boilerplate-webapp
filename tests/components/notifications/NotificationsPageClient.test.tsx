/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { NotificationsPageClient } from '@/components/notifications/NotificationsPageClient'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const listNotificationsRequest = jest.fn()
const markNotificationReadRequest = jest.fn(async () => undefined)
const markAllNotificationsReadRequest = jest.fn(async () => undefined)
const toast = jest.fn()
const replace = jest.fn()
let authState: { user: { id: string } | null; loading: boolean } = { user: { id: 'u1' }, loading: false }

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'pt',
	useFormatter: () => ({ dateTime: (date: Date) => date.toISOString() }),
}))
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
		<a href={href} onClick={onClick}>
			{children}
		</a>
	),
}))
jest.mock('@/i18n/navigation', () => ({ useRouter: () => ({ replace }) }))
jest.mock('@/design-system/Toast', () => ({ useToast: () => ({ toast }) }))
jest.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => authState }))
jest.mock('@/lib/notifications-client', () => ({
	listNotificationsRequest: (...args: unknown[]) => listNotificationsRequest(...args),
	markNotificationReadRequest: (...args: unknown[]) => markNotificationReadRequest(...args),
	markAllNotificationsReadRequest: () => markAllNotificationsReadRequest(),
}))

function item(id: string, read = false, link: string | null = '/notifications') {
	return {
		id,
		type: 'TEST',
		title: `Título ${id}`,
		text: `Texto ${id}`,
		link,
		read,
		createdAt: '2026-10-26T12:00:00.000Z',
	}
}

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
	})
}

describe('NotificationsPageClient', () => {
	beforeEach(() => {
		listNotificationsRequest.mockReset()
		markNotificationReadRequest.mockClear()
		markAllNotificationsReadRequest.mockClear()
		toast.mockClear()
		replace.mockClear()
		authState = { user: { id: 'u1' }, loading: false }
	})

	it('manda visitante sem login para /login e não busca nada', async () => {
		authState = { user: null, loading: false }

		const { container, unmount } = renderInJsdom(<NotificationsPageClient />)
		await flush()

		expect(replace).toHaveBeenCalledWith('/login')
		expect(listNotificationsRequest).not.toHaveBeenCalled()
		expect(container.innerHTML).toBe('')
		unmount()
	})

	it('mostra o estado vazio', async () => {
		listNotificationsRequest.mockResolvedValue({ items: [], unreadCount: 0, nextBefore: null })

		const { container, unmount } = renderInJsdom(<NotificationsPageClient />)
		await flush()

		expect(container.querySelector('[data-testid="notifications-empty"]')).not.toBeNull()
		unmount()
	})

	it('lista as notificações, destaca as não lidas e prefixa o link com o idioma', async () => {
		listNotificationsRequest.mockResolvedValue({
			items: [item('n1'), item('n2', true, null)],
			unreadCount: 1,
			nextBefore: null,
		})

		const { container, unmount } = renderInJsdom(<NotificationsPageClient />)
		await flush()

		expect(container.querySelector('[data-testid="notification-n1"]')?.getAttribute('data-read')).toBe('false')
		expect(container.querySelector('[data-testid="notification-n2"]')?.getAttribute('data-read')).toBe('true')
		expect(container.querySelector('[data-testid="notification-n1"] a')?.getAttribute('href')).toBe(
			'/pt/notifications'
		)
		expect(container.querySelector('[data-testid="notification-n2"] a')).toBeNull()
		unmount()
	})

	it('marcar como lida atualiza a lista e chama a API', async () => {
		listNotificationsRequest.mockResolvedValue({ items: [item('n1')], unreadCount: 1, nextBefore: null })
		const { container, unmount } = renderInJsdom(<NotificationsPageClient />)
		await flush()

		await act(async () => {
			Array.from(container.querySelectorAll('button'))
				.find((b) => b.textContent === 'markRead')
				?.click()
		})

		expect(markNotificationReadRequest).toHaveBeenCalledWith('n1')
		expect(container.querySelector('[data-testid="notification-n1"]')?.getAttribute('data-read')).toBe('true')
		unmount()
	})

	it('marcar todas como lidas zera o contador', async () => {
		listNotificationsRequest.mockResolvedValue({
			items: [item('n1'), item('n2')],
			unreadCount: 2,
			nextBefore: null,
		})
		const { container, unmount } = renderInJsdom(<NotificationsPageClient />)
		await flush()

		await act(async () => {
			Array.from(container.querySelectorAll('button'))
				.find((b) => b.textContent === 'markAllRead')
				?.click()
		})

		expect(markAllNotificationsReadRequest).toHaveBeenCalledTimes(1)
		expect(container.querySelectorAll('[data-read="false"]')).toHaveLength(0)
		unmount()
	})

	it('carrega a próxima página com o cursor', async () => {
		listNotificationsRequest
			.mockResolvedValueOnce({ items: [item('n1')], unreadCount: 0, nextBefore: '2026-10-26T12:00:00.000Z' })
			.mockResolvedValueOnce({ items: [item('n0', true)], unreadCount: 0, nextBefore: null })
		const { container, unmount } = renderInJsdom(<NotificationsPageClient />)
		await flush()

		await act(async () => {
			Array.from(container.querySelectorAll('button'))
				.find((b) => b.textContent === 'loadMore')
				?.click()
		})

		expect(listNotificationsRequest).toHaveBeenLastCalledWith({ before: '2026-10-26T12:00:00.000Z' })
		expect(container.querySelectorAll('li')).toHaveLength(2)
		unmount()
	})

	it('mostra erro de carregamento', async () => {
		listNotificationsRequest.mockRejectedValue(new Error('down'))

		const { container, unmount } = renderInJsdom(<NotificationsPageClient />)
		await flush()

		expect(container.textContent).toContain('loadError')
		unmount()
	})
})
