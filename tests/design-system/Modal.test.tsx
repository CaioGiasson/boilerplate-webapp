/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { Modal } from '@/design-system/Modal'
import { renderInJsdom } from '../helpers/renderInJsdom'

describe('Modal', () => {
	it('fechado não renderiza nada', () => {
		const { unmount } = renderInJsdom(
			<Modal open={false} onOpenChange={jest.fn()} title="Título" closeLabel="Fechar" />
		)

		expect(document.body.querySelector('[role="dialog"]')).toBeNull()
		unmount()
	})

	it('aberto expõe diálogo com título, descrição, corpo e rodapé', () => {
		const { unmount } = renderInJsdom(
			<Modal
				open
				onOpenChange={jest.fn()}
				title="Excluir?"
				description="Não dá para desfazer."
				closeLabel="Fechar"
				footer={<button type="button">Confirmar</button>}
				data-testid="modal"
			>
				<p>Corpo</p>
			</Modal>
		)

		const dialog = document.body.querySelector('[role="dialog"]')
		expect(dialog?.getAttribute('data-testid')).toBe('modal')
		expect(dialog?.textContent).toContain('Excluir?')
		expect(dialog?.textContent).toContain('Não dá para desfazer.')
		expect(dialog?.textContent).toContain('Corpo')
		expect(dialog?.textContent).toContain('Confirmar')
		expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy()
		expect(dialog?.getAttribute('aria-describedby')).toBeTruthy()
		unmount()
	})

	it('sem descrição não aponta para um aria-describedby inexistente', () => {
		const { unmount } = renderInJsdom(<Modal open onOpenChange={jest.fn()} title="Aviso" closeLabel="Fechar" />)

		expect(document.body.querySelector('[role="dialog"]')?.hasAttribute('aria-describedby')).toBe(false)
		unmount()
	})

	it('o botão X (com rótulo acessível) e o Escape pedem para fechar', () => {
		const onOpenChange = jest.fn()
		const { unmount } = renderInJsdom(
			<Modal open onOpenChange={onOpenChange} title="Aviso" closeLabel="Fechar janela" />
		)

		const closeButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
			button.textContent?.includes('Fechar janela')
		)
		act(() => {
			closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(onOpenChange).toHaveBeenLastCalledWith(false)

		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
		})
		expect(onOpenChange).toHaveBeenCalledTimes(2)
		unmount()
	})
})
