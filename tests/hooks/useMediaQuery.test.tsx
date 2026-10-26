/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { renderInJsdom } from '../helpers/renderInJsdom'

type Listener = () => void

function mockMatchMedia(initial: boolean) {
	const listeners = new Set<Listener>()
	const state = { matches: initial }
	window.matchMedia = jest.fn().mockImplementation(() => ({
		get matches() {
			return state.matches
		},
		addEventListener: (_event: string, listener: Listener) => listeners.add(listener),
		removeEventListener: (_event: string, listener: Listener) => listeners.delete(listener),
	})) as unknown as typeof window.matchMedia

	return {
		set(matches: boolean) {
			state.matches = matches
			listeners.forEach((listener) => listener())
		},
		listenerCount: () => listeners.size,
	}
}

function Probe({ query }: { query: string }) {
	return <span data-testid="probe">{String(useMediaQuery(query))}</span>
}

describe('useMediaQuery', () => {
	it('reflete o valor atual e reage a mudanças', () => {
		const media = mockMatchMedia(false)
		const { container, unmount } = renderInJsdom(<Probe query="(min-width: 768px)" />)
		const text = () => container.querySelector('[data-testid="probe"]')?.textContent

		expect(text()).toBe('false')
		act(() => media.set(true))
		expect(text()).toBe('true')
		unmount()
	})

	it('remove o listener ao desmontar', () => {
		const media = mockMatchMedia(true)
		const { unmount } = renderInJsdom(<Probe query="(min-width: 768px)" />)

		expect(media.listenerCount()).toBe(1)
		unmount()
		expect(media.listenerCount()).toBe(0)
	})
})
