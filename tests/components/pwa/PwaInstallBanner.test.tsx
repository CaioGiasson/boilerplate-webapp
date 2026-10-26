/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { PwaInstallBanner, PWA_DISMISS_STORAGE_KEY } from '@/components/pwa/PwaInstallBanner'
import { PWA_INSTALLED_STORAGE_KEY } from '@/lib/pwa/isPwaInstalled'
import { renderInJsdom } from '../../helpers/renderInJsdom'

let authState: { user: { id: string } | null; loading: boolean } = { user: { id: 'u1' }, loading: false }

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
}))
jest.mock('@/components/auth/AuthProvider', () => ({
	useAuth: () => authState,
}))

function stubMatchMedia() {
	window.matchMedia = jest.fn().mockImplementation(() => ({
		matches: false,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
	})) as unknown as typeof window.matchMedia
}

function beforeInstallPrompt(outcome: 'accepted' | 'dismissed') {
	const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
		prompt: jest.Mock
		userChoice: Promise<{ outcome: string }>
	}
	event.prompt = jest.fn(async () => undefined)
	event.userChoice = Promise.resolve({ outcome })
	return event
}

describe('PwaInstallBanner', () => {
	beforeEach(() => {
		window.localStorage.clear()
		authState = { user: { id: 'u1' }, loading: false }
		stubMatchMedia()
		Object.defineProperty(window.navigator, 'userAgent', {
			value: 'Mozilla/5.0 (X11; Linux) Chrome',
			configurable: true,
		})
	})

	it('fica oculto até o navegador oferecer a instalação', () => {
		const { container, unmount } = renderInJsdom(<PwaInstallBanner />)

		expect(container.querySelector('[data-testid="pwa-install-banner"]')).toBeNull()
		unmount()
	})

	it('mostra o botão ao receber beforeinstallprompt e instala', async () => {
		const { container, unmount } = renderInJsdom(<PwaInstallBanner />)
		const event = beforeInstallPrompt('accepted')

		act(() => {
			window.dispatchEvent(event)
		})
		expect(event.defaultPrevented).toBe(true)
		const cta = container.querySelector('[data-testid="pwa-install-cta"]') as HTMLButtonElement
		expect(cta).not.toBeNull()

		await act(async () => {
			cta.click()
		})

		expect(event.prompt).toHaveBeenCalledTimes(1)
		expect(window.localStorage.getItem(PWA_INSTALLED_STORAGE_KEY)).toBe('1')
		expect(container.querySelector('[data-testid="pwa-install-banner"]')).toBeNull()
		unmount()
	})

	it('"Agora não" some e lembra a escolha', () => {
		const { container, unmount } = renderInJsdom(<PwaInstallBanner />)
		act(() => {
			window.dispatchEvent(beforeInstallPrompt('dismissed'))
		})

		act(() => {
			;(container.querySelector('[data-testid="pwa-install-dismiss"]') as HTMLButtonElement).click()
		})

		expect(window.localStorage.getItem(PWA_DISMISS_STORAGE_KEY)).toBe('1')
		expect(container.querySelector('[data-testid="pwa-install-banner"]')).toBeNull()
		unmount()
	})

	it('não aparece para visitante sem login nem depois de dispensado', () => {
		authState = { user: null, loading: false }
		const guest = renderInJsdom(<PwaInstallBanner />)
		act(() => {
			window.dispatchEvent(beforeInstallPrompt('dismissed'))
		})
		expect(guest.container.querySelector('[data-testid="pwa-install-banner"]')).toBeNull()
		guest.unmount()

		authState = { user: { id: 'u1' }, loading: false }
		window.localStorage.setItem(PWA_DISMISS_STORAGE_KEY, '1')
		const dismissed = renderInJsdom(<PwaInstallBanner />)
		act(() => {
			window.dispatchEvent(beforeInstallPrompt('dismissed'))
		})
		expect(dismissed.container.querySelector('[data-testid="pwa-install-banner"]')).toBeNull()
		dismissed.unmount()
	})

	it('no iOS mostra o passo a passo, sem botão de instalar', () => {
		Object.defineProperty(window.navigator, 'userAgent', {
			value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari',
			configurable: true,
		})
		const { container, unmount } = renderInJsdom(<PwaInstallBanner />)

		expect(container.querySelector('[data-testid="pwa-install-banner"]')?.textContent).toContain('iosShare')
		expect(container.querySelector('[data-testid="pwa-install-cta"]')).toBeNull()
		unmount()
	})
})
