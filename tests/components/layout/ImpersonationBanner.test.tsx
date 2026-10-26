/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { ImpersonationBanner, formatRemaining } from '@/components/layout/ImpersonationBanner'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const logout = jest.fn(async () => undefined)
const refresh = jest.fn(async () => undefined)
let currentUser: { nickname: string; impersonation: { expiresAt: string } | null } | null = null

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values ? `${key}:${Object.values(values).join(',')}` : key,
}))
jest.mock('@/components/auth/AuthProvider', () => ({
	useAuth: () => ({ user: currentUser, logout, refresh }),
}))

describe('formatRemaining', () => {
	it.each([
		[600, '10:00'],
		[75, '01:15'],
		[9, '00:09'],
		[0, '00:00'],
		[-5, '00:00'],
	])('%i s -> %s', (seconds, expected) => {
		expect(formatRemaining(seconds)).toBe(expected)
	})
})

describe('ImpersonationBanner', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date('2026-10-26T12:00:00.000Z'))
		logout.mockClear()
		refresh.mockClear()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('não renderiza fora de impersonamento', () => {
		currentUser = { nickname: 'bob', impersonation: null }
		const { container, unmount } = renderInJsdom(<ImpersonationBanner />)

		expect(container.innerHTML).toBe('')
		unmount()
	})

	it('mostra o alvo, o tempo restante e sai pelo botão', () => {
		currentUser = { nickname: 'bob', impersonation: { expiresAt: '2026-10-26T12:10:00.000Z' } }
		const { container, unmount } = renderInJsdom(<ImpersonationBanner />)

		const banner = container.querySelector('[data-testid="impersonation-banner"]')
		expect(banner?.textContent).toContain('banner:bob')
		expect(banner?.textContent).toContain('remaining:10:00')

		act(() => {
			jest.advanceTimersByTime(60_000)
		})
		expect(banner?.textContent).toContain('remaining:09:00')

		act(() => {
			;(container.querySelector('button') as HTMLButtonElement).click()
		})
		expect(logout).toHaveBeenCalledTimes(1)
		unmount()
	})

	it('relê a sessão quando o tempo acaba', () => {
		currentUser = { nickname: 'bob', impersonation: { expiresAt: '2026-10-26T12:00:05.000Z' } }
		const { unmount } = renderInJsdom(<ImpersonationBanner />)

		act(() => {
			jest.advanceTimersByTime(6_000)
		})

		expect(refresh).toHaveBeenCalled()
		unmount()
	})
})
