/**
 * @jest-environment jsdom
 */
import { FINE_POINTER_HOVER_MEDIA, isPortaledMenuEventTarget, matchesFinePointerHover } from '@/utils/pointerHover'

describe('pointerHover', () => {
	it('detecta hover confiável só com hover e ponteiro fino', () => {
		expect(matchesFinePointerHover(() => ({ matches: true }))).toBe(true)
		expect(matchesFinePointerHover((query) => ({ matches: query === FINE_POINTER_HOVER_MEDIA }))).toBe(true)
		expect(matchesFinePointerHover(() => ({ matches: false }))).toBe(false)
	})

	it('reconhece alvo dentro de um menu portaled', () => {
		const menu = document.createElement('div')
		menu.setAttribute('role', 'menu')
		const item = document.createElement('div')
		menu.appendChild(item)
		document.body.appendChild(menu)

		expect(isPortaledMenuEventTarget(item)).toBe(true)
		expect(isPortaledMenuEventTarget(document.body)).toBe(false)

		menu.remove()
	})
})
