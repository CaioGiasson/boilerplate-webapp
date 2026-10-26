import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { messagesByLocale } from '@/constants/texts'

const offlineHtml = readFileSync(join(process.cwd(), 'public', 'offline.html'), 'utf8')

describe('public/offline.html', () => {
	it.each(['pt', 'en', 'es'] as const)('espelha os textos pwa.offline* do catálogo %s', (locale) => {
		const { offlineTitle, offlineDescription, offlineRetry } = messagesByLocale[locale].pwa

		for (const text of [offlineTitle, offlineDescription, offlineRetry]) {
			expect(offlineHtml).toContain(text)
		}
	})

	it('é autossuficiente: só carrega /theme.js da própria origem', () => {
		expect(offlineHtml).not.toMatch(/https?:\/\/(?!www\.w3\.org)/)
		expect(offlineHtml).toContain('/theme.js')
	})
})
