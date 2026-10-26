/**
 * @jest-environment jsdom
 */
import * as React from 'react'
import { act } from 'react'
import { ToastProvider, useToast } from '@/design-system/Toast'
import { renderInJsdom } from '../helpers/renderInJsdom'

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
}))

jest.mock('@/i18n/navigation', () => ({
	usePathname: () => '/',
}))

const TOAST_EXIT_MS = 200

function Trigger() {
	const { toast } = useToast()
	return (
		<button type="button" data-testid="fire" onClick={() => toast({ variant: 'error', title: 'Falhou' })}>
			fire
		</button>
	)
}

describe('ToastProvider', () => {
	let rendered: ReturnType<typeof renderInJsdom>

	beforeEach(() => {
		jest.useFakeTimers()
		if (!globalThis.crypto?.randomUUID) {
			Object.defineProperty(globalThis, 'crypto', {
				value: { randomUUID: () => `id-${Math.random()}` },
				configurable: true,
			})
		}
		rendered = renderInJsdom(
			<ToastProvider>
				<Trigger />
			</ToastProvider>
		)
	})

	afterEach(() => {
		rendered.unmount()
		jest.useRealTimers()
	})

	function fire() {
		act(() => {
			;(rendered.container.querySelector('[data-testid="fire"]') as HTMLButtonElement).click()
		})
	}

	it('mostra o toast disparado', () => {
		fire()
		expect(document.querySelector('[data-testid="toast-error"]')?.textContent).toContain('Falhou')
	})

	it('fecha o toast ao clicar nele', () => {
		fire()
		act(() => {
			;(document.querySelector('[data-testid="toast-error"]') as HTMLElement).click()
			jest.advanceTimersByTime(TOAST_EXIT_MS)
		})
		expect(document.querySelector('[data-testid="toast-error"]')).toBeNull()
	})

	it('fecha o toast pelo botão de dispensar', () => {
		fire()
		act(() => {
			;(document.querySelector('[data-testid="toast-dismiss"]') as HTMLElement).click()
			jest.advanceTimersByTime(TOAST_EXIT_MS)
		})
		expect(document.querySelector('[data-testid="toast-error"]')).toBeNull()
	})
})
