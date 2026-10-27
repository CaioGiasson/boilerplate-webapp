/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { Pagination } from '@/design-system/Pagination'
import { renderInJsdom } from '../helpers/renderInJsdom'

const BASE = { navLabel: 'Paginação', previousLabel: 'Anterior', nextLabel: 'Próxima' }

function buttons(container: HTMLElement) {
	const [previous, next] = Array.from(container.querySelectorAll('button'))
	return { previous, next }
}

describe('Pagination', () => {
	it('rotula a navegação, mostra o resumo e chama os callbacks', () => {
		const onPrevious = jest.fn()
		const onNext = jest.fn()
		const { container, unmount } = renderInJsdom(
			<Pagination {...BASE} hasPrevious hasNext onPrevious={onPrevious} onNext={onNext} summary="Página 2" />
		)

		expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Paginação')
		expect(container.textContent).toContain('Página 2')
		const { previous, next } = buttons(container)
		act(() => {
			previous.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			next.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(onPrevious).toHaveBeenCalledTimes(1)
		expect(onNext).toHaveBeenCalledTimes(1)
		unmount()
	})

	it('desabilita o lado sem página e os dois durante o carregamento', () => {
		const first = renderInJsdom(
			<Pagination {...BASE} hasPrevious={false} hasNext onPrevious={jest.fn()} onNext={jest.fn()} />
		)
		expect(buttons(first.container).previous.disabled).toBe(true)
		expect(buttons(first.container).next.disabled).toBe(false)
		first.unmount()

		const second = renderInJsdom(
			<Pagination {...BASE} hasPrevious hasNext disabled onPrevious={jest.fn()} onNext={jest.fn()} />
		)
		expect(buttons(second.container).previous.disabled).toBe(true)
		expect(buttons(second.container).next.disabled).toBe(true)
		second.unmount()
	})
})
