/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { AdminPageClient } from '@/components/admin/AdminPageClient'
import { renderInJsdom } from '../../helpers/renderInJsdom'

let authState: { user: { role: string; impersonation?: unknown } | null; loading: boolean }

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
jest.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => authState }))
jest.mock('@/components/admin/AdminUsersSection', () => ({ AdminUsersSection: () => <p>USERS-SECTION</p> }))
jest.mock('@/components/admin/AdminAuditSection', () => ({ AdminAuditSection: () => <p>AUDIT-SECTION</p> }))

describe('AdminPageClient', () => {
	it('admin vê as abas e troca entre usuários e auditoria', () => {
		authState = { user: { role: 'ADMIN' }, loading: false }
		const { container, unmount } = renderInJsdom(<AdminPageClient />)

		const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
		expect(tabs.map((tab) => tab.textContent)).toEqual(['tabUsers', 'tabAudit'])
		expect(container.querySelector('[role="tabpanel"]')?.textContent).toBe('USERS-SECTION')

		act(() => {
			tabs[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(container.querySelector('[role="tabpanel"]')?.textContent).toBe('AUDIT-SECTION')
		unmount()
	})

	it.each([
		['usuário comum', { role: 'USER' }],
		['admin impersonando', { role: 'ADMIN', impersonation: { until: 1 } }],
		['visitante', null],
	])('%s vê acesso negado e nenhuma seção', (_label, user) => {
		authState = { user, loading: false }
		const { container, unmount } = renderInJsdom(<AdminPageClient />)

		expect(container.querySelector('[data-testid="admin-access-denied"]')).not.toBeNull()
		expect(container.querySelector('[role="tablist"]')).toBeNull()
		unmount()
	})

	it('enquanto carrega a sessão mostra só o aviso', () => {
		authState = { user: null, loading: true }
		const { container, unmount } = renderInJsdom(<AdminPageClient />)

		expect(container.textContent).toContain('loading')
		expect(container.querySelector('[role="tablist"]')).toBeNull()
		unmount()
	})
})
