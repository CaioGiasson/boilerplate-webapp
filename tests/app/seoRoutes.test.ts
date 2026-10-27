import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { locales } from '@/constants/texts'
import { PUBLIC_PAGE_PATHS } from '@/constants/publicPages'

describe('robots e sitemap', () => {
	const originalBaseUrl = process.env.APP_BASE_URL

	beforeEach(() => {
		process.env.APP_BASE_URL = 'https://app.example.com/'
	})

	afterAll(() => {
		if (originalBaseUrl === undefined) {
			delete process.env.APP_BASE_URL
		} else {
			process.env.APP_BASE_URL = originalBaseUrl
		}
	})

	it('robots bloqueia /api/ e aponta para o sitemap na origem configurada', () => {
		expect(robots()).toEqual({
			rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
			sitemap: 'https://app.example.com/sitemap.xml',
		})
	})

	it('sitemap lista cada página pública com alternates em todos os idiomas', () => {
		const entries = sitemap()

		expect(entries).toHaveLength(PUBLIC_PAGE_PATHS.length)
		for (const entry of entries) {
			expect(Object.keys(entry.alternates?.languages ?? {})).toEqual([...locales])
		}
		expect(entries.every((entry) => entry.url.startsWith('https://app.example.com/'))).toBe(true)
	})
})
