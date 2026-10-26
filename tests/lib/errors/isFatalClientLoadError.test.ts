import { isFatalClientLoadError, shouldOpenStaticErrorPage } from '@/lib/errors/isFatalClientLoadError'

describe('isFatalClientLoadError', () => {
	it.each([
		[{ name: 'ChunkLoadError' }],
		[{ message: 'Loading chunk 123 failed.' }],
		[{ message: 'Failed to fetch dynamically imported module: /_next/x.js' }],
		[{ message: 'error loading dynamically imported module' }],
		[{ message: 'Unable to preload CSS for /_next/static/css/a.css' }],
		[{ message: 'Application error: a client-side exception has occurred' }],
	])('trata %p como fatal online', (input) => {
		expect(isFatalClientLoadError(input)).toBe(true)
	})

	it('ignora falha de chunk quando offline, mas não o erro padrão do Next', () => {
		expect(isFatalClientLoadError({ name: 'ChunkLoadError', offline: true })).toBe(false)
		expect(isFatalClientLoadError({ message: 'Loading chunk 9 failed', offline: true })).toBe(false)
		expect(isFatalClientLoadError({ message: 'Application error: a client-side exception', offline: true })).toBe(
			true
		)
	})

	it('não trata erro comum como fatal', () => {
		expect(isFatalClientLoadError({ name: 'TypeError', message: 'x is undefined' })).toBe(false)
		expect(isFatalClientLoadError({})).toBe(false)
	})

	it('não abre a página estática quando já está nela', () => {
		expect(shouldOpenStaticErrorPage('/error.html')).toBe(false)
		expect(shouldOpenStaticErrorPage('/pt/error.html')).toBe(false)
		expect(shouldOpenStaticErrorPage('/pt/profile')).toBe(true)
	})
})
