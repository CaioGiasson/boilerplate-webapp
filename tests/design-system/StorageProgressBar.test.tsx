/**
 * @jest-environment jsdom
 */
import { StorageProgressBar } from '@/design-system/StorageProgressBar'
import { renderInJsdom } from '../helpers/renderInJsdom'

function renderBar(percentUsed: number) {
	const rendered = renderInJsdom(<StorageProgressBar percentUsed={percentUsed} data-testid="bar" />)
	const bar = rendered.container.querySelector('[data-testid="bar"]') as HTMLElement
	return { ...rendered, bar, fill: bar.firstElementChild as HTMLElement }
}

describe('StorageProgressBar', () => {
	it.each([
		[10, 'bg-emerald-500'],
		[59.9, 'bg-emerald-500'],
		[60, 'bg-amber-500'],
		[90, 'bg-amber-500'],
		[90.1, 'bg-red-500'],
	])('com %s%% usa a classe %s', (percent, expectedClass) => {
		const { fill, unmount } = renderBar(percent)

		expect(fill.className).toContain(expectedClass)
		unmount()
	})

	it('limita o valor entre 0 e 100 e expõe aria-valuenow', () => {
		const over = renderBar(250)
		expect(over.bar.getAttribute('aria-valuenow')).toBe('100')
		expect(over.fill.style.width).toBe('100%')
		over.unmount()

		const under = renderBar(-5)
		expect(under.bar.getAttribute('aria-valuenow')).toBe('0')
		expect(under.fill.style.width).toBe('0%')
		under.unmount()
	})
})
