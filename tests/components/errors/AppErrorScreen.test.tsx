/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { AppErrorScreen } from '@/components/errors/AppErrorScreen'
import { renderInJsdom } from '../../helpers/renderInJsdom'

describe('AppErrorScreen', () => {
	it('mostra a mensagem como alerta', () => {
		const { container, unmount } = renderInJsdom(<AppErrorScreen message={'Algo deu errado\n\nTente de novo'} />)

		const screen = container.querySelector('[data-testid="app-error-screen"]')
		expect(screen?.getAttribute('role')).toBe('alert')
		expect(screen?.textContent).toContain('Algo deu errado')
		expect(container.querySelector('button')).toBeNull()
		unmount()
	})

	it('chama onRetry ao clicar no botão', () => {
		const onRetry = jest.fn()
		const { container, unmount } = renderInJsdom(
			<AppErrorScreen message="erro" retryLabel="Tentar" onRetry={onRetry} />
		)

		act(() => {
			;(container.querySelector('button') as HTMLButtonElement).click()
		})

		expect(onRetry).toHaveBeenCalledTimes(1)
		unmount()
	})
})
