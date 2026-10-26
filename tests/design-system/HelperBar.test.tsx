/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { HelperBar } from '@/design-system/HelperBar'
import { renderInJsdom } from '../helpers/renderInJsdom'

describe('HelperBar', () => {
	it('renderiza o conteúdo, o rótulo de dispensar e chama onDismiss uma vez', () => {
		const onDismiss = jest.fn()
		const { container, unmount } = renderInJsdom(
			<HelperBar dismissLabel="Fechar" onDismiss={onDismiss} testId="helper-bar">
				<span>Respondendo</span>
			</HelperBar>
		)

		const frame = container.querySelector('[data-testid="helper-bar"]')
		expect(frame?.textContent).toContain('Respondendo')
		const button = frame?.querySelector('button')
		expect(button?.getAttribute('aria-label')).toBe('Fechar')
		act(() => {
			button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(onDismiss).toHaveBeenCalledTimes(1)
		unmount()
	})
})
