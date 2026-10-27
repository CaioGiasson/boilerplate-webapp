/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { AdminAuditSection } from '@/components/admin/AdminAuditSection'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const listAdminAuditEventsRequest = jest.fn()

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key,
	useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}))
jest.mock('@/lib/auth-client', () => ({
	listAdminAuditEventsRequest: (...args: unknown[]) => listAdminAuditEventsRequest(...args),
}))

function event(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		action: 'user.password_changed',
		actorType: 'user',
		actor: { id: 'u1', nickname: 'alice' },
		target: { id: 'u1', nickname: 'alice' },
		createdAt: '2026-10-26T12:00:00.000Z',
		...overrides,
	}
}

function page(items: unknown[], nextCursor: string | null = null) {
	return { items, pageInfo: { nextCursor, hasNext: nextCursor !== null, limit: 20 } }
}

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
	})
}

function click(element: Element | null | undefined) {
	act(() => {
		element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
}

describe('AdminAuditSection', () => {
	beforeEach(() => listAdminAuditEventsRequest.mockReset())

	it('mostra quando, ação traduzida, quem agiu e a conta afetada', async () => {
		listAdminAuditEventsRequest.mockResolvedValue(
			page([
				event('1'),
				event('2', { action: 'operator.role_changed', actorType: 'operator', actor: null }),
				event('3', {
					action: 'admin.impersonation_token_created',
					actorType: 'admin',
					target: { id: 'x', nickname: null },
				}),
				event('4', { actorType: 'system', actor: null, target: null }),
			])
		)

		const { container, unmount } = renderInJsdom(<AdminAuditSection />)
		await flush()

		expect(listAdminAuditEventsRequest).toHaveBeenCalledWith({
			cursor: undefined,
			action: undefined,
			order: 'desc',
		})
		const rows = Array.from(container.querySelectorAll('tbody tr')).map((tr) =>
			Array.from(tr.querySelectorAll('td')).map((td) => td.textContent)
		)
		expect(rows).toEqual([
			['2026-10-26', 'auditActions.user_password_changed', 'alice', 'alice'],
			['2026-10-26', 'auditActions.operator_role_changed', 'auditActorOperator', 'alice'],
			['2026-10-26', 'auditActions.admin_impersonation_token_created', 'alice', 'auditDeletedAccount'],
			['2026-10-26', 'auditActions.user_password_changed', 'auditActorSystem', ''],
		])
		unmount()
	})

	it('pagina por cursor e inverte a ordem pelo cabeçalho "Quando"', async () => {
		listAdminAuditEventsRequest
			.mockResolvedValueOnce(page([event('1')], 'cursor-2'))
			.mockResolvedValueOnce(page([event('2')]))
			.mockResolvedValueOnce(page([event('1')], 'cursor-2'))
			.mockResolvedValueOnce(page([event('1')]))

		const { container, unmount } = renderInJsdom(<AdminAuditSection />)
		await flush()
		const [previous, next] = Array.from(container.querySelectorAll('nav button'))

		click(next)
		await flush()
		expect(listAdminAuditEventsRequest).toHaveBeenLastCalledWith({
			cursor: 'cursor-2',
			action: undefined,
			order: 'desc',
		})
		expect(container.textContent).toContain('pageNumber:{"page":2}')

		click(previous)
		await flush()
		expect(listAdminAuditEventsRequest).toHaveBeenLastCalledWith({
			cursor: undefined,
			action: undefined,
			order: 'desc',
		})

		const header = Array.from(container.querySelectorAll('th')).find((th) => th.textContent === 'auditColumnWhen')
		click(header?.querySelector('button'))
		await flush()
		expect(listAdminAuditEventsRequest).toHaveBeenLastCalledWith({
			cursor: undefined,
			action: undefined,
			order: 'asc',
		})
		unmount()
	})

	it('estado vazio e erro de carregamento', async () => {
		listAdminAuditEventsRequest.mockResolvedValueOnce(page([]))
		const empty = renderInJsdom(<AdminAuditSection />)
		await flush()
		expect(empty.container.textContent).toContain('auditEmpty')
		empty.unmount()

		listAdminAuditEventsRequest.mockRejectedValueOnce(new Error('boom'))
		const failed = renderInJsdom(<AdminAuditSection />)
		await flush()
		expect(failed.container.textContent).toBe('auditLoadError')
		failed.unmount()
	})
})
