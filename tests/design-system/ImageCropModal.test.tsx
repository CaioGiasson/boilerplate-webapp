/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { ImageCropModal } from '@/design-system/ImageCropModal'
import { renderInJsdom } from '../helpers/renderInJsdom'

const AREA = { x: 1, y: 2, width: 300, height: 300 }

jest.mock('react-easy-crop', () => ({
	__esModule: true,
	default: ({ onCropComplete }: { onCropComplete: (area: unknown, pixels: unknown) => void }) => (
		<button type="button" data-testid="fake-cropper" onClick={() => onCropComplete({}, AREA)} />
	),
}))

beforeAll(() => {
	// O Slider do Radix mede o elemento com ResizeObserver, que o jsdom não implementa.
	;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
})

const baseProps = {
	imageSrc: 'blob:photo',
	aspect: 1,
	title: 'Ajustar foto',
	confirmLabel: 'Usar foto',
	cancelLabel: 'Cancelar',
	zoomLabel: 'Zoom',
}

describe('ImageCropModal', () => {
	it('não renderiza fechado ou sem imagem', () => {
		const closed = renderInJsdom(
			<ImageCropModal {...baseProps} open={false} onCancel={jest.fn()} onConfirm={jest.fn()} />
		)
		expect(closed.container.innerHTML).toBe('')
		closed.unmount()

		const noImage = renderInJsdom(
			<ImageCropModal {...baseProps} imageSrc={null} open onCancel={jest.fn()} onConfirm={jest.fn()} />
		)
		expect(noImage.container.innerHTML).toBe('')
		noImage.unmount()
	})

	it('só habilita Confirmar depois de o recorte ser calculado e entrega a área em pixels', () => {
		const onConfirm = jest.fn()
		const { container, unmount } = renderInJsdom(
			<ImageCropModal {...baseProps} open onCancel={jest.fn()} onConfirm={onConfirm} />
		)
		const confirm = container.querySelector('[data-testid="image-crop-modal-confirm"]') as HTMLButtonElement

		expect(confirm.disabled).toBe(true)
		act(() => {
			;(container.querySelector('[data-testid="fake-cropper"]') as HTMLButtonElement).click()
		})
		expect(confirm.disabled).toBe(false)
		act(() => confirm.click())

		expect(onConfirm).toHaveBeenCalledWith(AREA)
		unmount()
	})

	it('cancela por Escape e pelo botão', () => {
		const onCancel = jest.fn()
		const { container, unmount } = renderInJsdom(
			<ImageCropModal {...baseProps} open onCancel={onCancel} onConfirm={jest.fn()} />
		)

		act(() => {
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		})
		expect(onCancel).toHaveBeenCalledTimes(1)

		const cancelButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Cancelar')
		act(() => cancelButton?.click())
		expect(onCancel).toHaveBeenCalledTimes(2)
		unmount()
	})
})
