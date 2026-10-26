import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { messagesByLocale } from '@/constants/texts'
import { isFatalClientLoadError } from '@/lib/errors/isFatalClientLoadError'

const errorHtml = readFileSync(join(process.cwd(), 'public', 'error.html'), 'utf8')
const errorGuard = readFileSync(join(process.cwd(), 'public', 'error-guard.js'), 'utf8')

describe('public/error.html', () => {
	it.each(['pt', 'en', 'es'] as const)('espelha os textos error.* do catálogo %s', (locale) => {
		const { title, description, retry, backHome } = messagesByLocale[locale].error
		for (const text of [title, description, retry, backHome]) {
			expect(errorHtml).toContain(text)
		}
	})

	it('não depende de script inline externo nem de marca de produto', () => {
		expect(errorHtml).not.toMatch(/https?:\/\//)
	})
})

describe('public/error-guard.js', () => {
	it('contém os mesmos padrões de erro fatal de isFatalClientLoadError', () => {
		const samples = [
			'ChunkLoadError',
			'Loading chunk 1 failed',
			'Failed to fetch dynamically imported module',
			'error loading dynamically imported module',
			'Unable to preload CSS',
			'Application error: a client-side exception',
		]
		for (const sample of samples) {
			expect(isFatalClientLoadError({ message: sample })).toBe(true)
		}
		expect(errorGuard).toContain('Failed to fetch dynamically imported module')
		expect(errorGuard).toContain('error loading dynamically imported module')
		expect(errorGuard).toContain('Unable to preload CSS')
		expect(errorGuard).toContain('Application error: a client-side exception')
		expect(errorGuard).toContain('Loading chunk')
	})
})
