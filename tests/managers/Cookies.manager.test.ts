/**
 * @jest-environment jsdom
 */
import CookiesManager, { COOKIE_KEYS } from '@/managers/Cookies.manager'

describe('CookiesManager', () => {
	beforeEach(() => {
		document.cookie.split(';').forEach((cookie) => {
			const name = cookie.split('=')[0]?.trim()
			if (name) {
				document.cookie = `${name}=; max-age=0; path=/`
			}
		})
	})

	it('deve gravar e ler um cookie', () => {
		CookiesManager.set(COOKIE_KEYS.THEME, 'dark')
		expect(CookiesManager.get(COOKIE_KEYS.THEME)).toBe('dark')
	})

	it('deve retornar null quando a chave não existe', () => {
		expect(CookiesManager.get('missing-key')).toBeNull()
	})
})
