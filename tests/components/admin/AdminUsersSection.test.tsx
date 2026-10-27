/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { AdminUsersSection } from '@/components/admin/AdminUsersSection'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const listAdminUsersRequest = jest.fn()
const createImpersonationTokenRequest = jest.fn()
const toast = jest.fn()

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key,
	useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}))
jest.mock('@/i18n/navigation', () => ({
	Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
	usePathname: () => '/',
	useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/design-system/Toast', () => ({ useToast: () => ({ toast }) }))
jest.mock('@/components/auth/ImpersonationConsumer', () => ({ IMPERSONATE_QUERY_PARAM: 'impersonate' }))
jest.mock('@/lib/auth-client', () => ({
	listAdminUsersRequest: (...args: unknown[]) => listAdminUsersRequest(...args),
	createImpersonationTokenRequest: (...args: unknown[]) => createImpersonationTokenRequest(...args),
}))

function row(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		nickname: `user-${id}`,
		emailMasked: 'a***@e***.com',
		role: 'USER',
		emailVerified: true,
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

function type(input: HTMLInputElement, value: string) {
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
		setter?.call(input, value)
		input.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

function paginationButtons(container: HTMLElement) {
	const [previous, next] = Array.from(container.querySelectorAll('nav button'))
	return { previous: previous as HTMLButtonElement, next: next as HTMLButtonElement }
}

describe('AdminUsersSection', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		listAdminUsersRequest.mockReset()
		createImpersonationTokenRequest.mockReset()
		toast.mockClear()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('carrega a primeira página sem cursor e mostra as linhas', async () => {
		listAdminUsersRequest.mockResolvedValue(
			page([row('1'), row('2', { role: 'ADMIN', emailVerified: false })], 'cursor-2')
		)

		const { container, unmount } = renderInJsdom(<AdminUsersSection />)
		await flush()

		expect(listAdminUsersRequest).toHaveBeenCalledWith({ cursor: undefined, q: undefined, order: 'desc' })
		expect(container.querySelectorAll('tbody tr')).toHaveLength(2)
		expect(container.textContent).toContain('user-1')
		expect(container.textContent).toContain('roleAdmin')
		expect(container.textContent).toContain('verifiedNo')
		expect(container.textContent).toContain('pageNumber:{"page":1}')
		expect(paginationButtons(container).previous.disabled).toBe(true)
		expect(paginationButtons(container).next.disabled).toBe(false)
		unmount()
	})

	it('Próxima usa o nextCursor e Anterior volta à primeira página', async () => {
		listAdminUsersRequest
			.mockResolvedValueOnce(page([row('1')], 'cursor-2'))
			.mockResolvedValueOnce(page([row('2')]))
			.mockResolvedValueOnce(page([row('1')], 'cursor-2'))

		const { container, unmount } = renderInJsdom(<AdminUsersSection />)
		await flush()

		click(paginationButtons(container).next)
		await flush()
		expect(listAdminUsersRequest).toHaveBeenLastCalledWith({ cursor: 'cursor-2', q: undefined, order: 'desc' })
		expect(container.textContent).toContain('pageNumber:{"page":2}')
		expect(paginationButtons(container).next.disabled).toBe(true)

		click(paginationButtons(container).previous)
		await flush()
		expect(listAdminUsersRequest).toHaveBeenLastCalledWith({ cursor: undefined, q: undefined, order: 'desc' })
		expect(container.textContent).toContain('pageNumber:{"page":1}')
		unmount()
	})

	it('a busca espera o debounce, volta à primeira página e envia q', async () => {
		listAdminUsersRequest.mockResolvedValue(page([row('1')], 'cursor-2'))
		const { container, unmount } = renderInJsdom(<AdminUsersSection />)
		await flush()
		click(paginationButtons(container).next)
		await flush()
		listAdminUsersRequest.mockClear()
		listAdminUsersRequest.mockResolvedValue(page([row('9', { nickname: 'ada' })]))

		type(container.querySelector('input') as HTMLInputElement, '  ada ')
		expect(listAdminUsersRequest).not.toHaveBeenCalled()
		act(() => {
			jest.advanceTimersByTime(300)
		})
		await flush()

		expect(listAdminUsersRequest).toHaveBeenCalledTimes(1)
		expect(listAdminUsersRequest).toHaveBeenCalledWith({ cursor: undefined, q: 'ada', order: 'desc' })
		expect(container.textContent).toContain('pageNumber:{"page":1}')
		unmount()
	})

	it('clicar em "Criado em" inverte a ordem e volta à primeira página', async () => {
		listAdminUsersRequest.mockResolvedValue(page([row('1')]))
		const { container, unmount } = renderInJsdom(<AdminUsersSection />)
		await flush()

		const header = Array.from(container.querySelectorAll('th')).find((th) => th.textContent === 'columnCreated')
		expect(header?.getAttribute('aria-sort')).toBe('descending')
		click(header?.querySelector('button'))
		await flush()

		expect(listAdminUsersRequest).toHaveBeenLastCalledWith({ cursor: undefined, q: undefined, order: 'asc' })
		unmount()
	})

	it('lista vazia diferencia "sem usuários" de "sem resultado para a busca"', async () => {
		listAdminUsersRequest.mockResolvedValue(page([]))
		const { container, unmount } = renderInJsdom(<AdminUsersSection />)
		await flush()
		expect(container.textContent).toContain('empty')
		expect(container.textContent).not.toContain('emptySearch')

		type(container.querySelector('input') as HTMLInputElement, 'zzz')
		act(() => {
			jest.advanceTimersByTime(300)
		})
		await flush()
		expect(container.textContent).toContain('emptySearch')
		unmount()
	})

	it('mostra a mensagem de erro quando a listagem falha', async () => {
		listAdminUsersRequest.mockRejectedValue(new Error('boom'))

		const { container, unmount } = renderInJsdom(<AdminUsersSection />)
		await flush()

		expect(container.textContent).toBe('loadError')
		unmount()
	})

	it('copia o link de impersonamento só para não-admin', async () => {
		listAdminUsersRequest.mockResolvedValue(page([row('1'), row('2', { role: 'ADMIN' })]))
		createImpersonationTokenRequest.mockResolvedValue({ token: 'tok en', expiresAt: '2026-10-26T12:10:00.000Z' })
		const writeText = jest.fn(async () => undefined)
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

		const { container, unmount } = renderInJsdom(<AdminUsersSection />)
		await flush()
		const actions = container.querySelectorAll('tbody tr td:last-child button')
		expect(actions).toHaveLength(1)

		click(actions[0])
		await flush()

		expect(createImpersonationTokenRequest).toHaveBeenCalledWith('1')
		expect(writeText).toHaveBeenCalledWith(expect.stringContaining('impersonate=tok%20en'))
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
		unmount()
	})
})
