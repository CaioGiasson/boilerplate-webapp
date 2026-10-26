/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { ColorPalettePicker } from '@/design-system/ColorPalettePicker'
import { renderInJsdom } from '../helpers/renderInJsdom'

const COLORS = ['#ef4444', '#10b981', '#3b82f6'] as const

describe('ColorPalettePicker', () => {
	it('marca a cor selecionada sem diferenciar maiúsculas e minúsculas', () => {
		const { container, unmount } = renderInJsdom(
			<ColorPalettePicker colors={COLORS} value="#10B981" onChange={jest.fn()} label="Cor" />
		)

		const options = Array.from(container.querySelectorAll('[role="option"]'))
		expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false'])
		unmount()
	})

	it('chama onChange com a cor clicada', () => {
		const onChange = jest.fn()
		const { container, unmount } = renderInJsdom(
			<ColorPalettePicker colors={COLORS} value={COLORS[0]} onChange={onChange} />
		)

		act(() => {
			;(container.querySelectorAll('[role="option"]')[2] as HTMLButtonElement).click()
		})

		expect(onChange).toHaveBeenCalledWith('#3b82f6')
		unmount()
	})
})
