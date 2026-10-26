import { messagesByLocale } from '@/constants/texts'

function collectKeys(value: unknown, prefix = ''): string[] {
	if (value === null || typeof value !== 'object') {
		return [prefix]
	}

	return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
		collectKeys(child, prefix ? `${prefix}.${key}` : key)
	)
}

describe('paridade dos catálogos i18n', () => {
	const keysByLocale = Object.fromEntries(
		Object.entries(messagesByLocale).map(([locale, messages]) => [locale, new Set(collectKeys(messages))])
	)
	const locales = Object.keys(keysByLocale)

	it.each(locales)('o catálogo %s tem as mesmas chaves dos demais', (locale) => {
		const current = keysByLocale[locale]
		const missing = locales.flatMap((other) => [...keysByLocale[other]].filter((key) => !current.has(key)))

		expect([...new Set(missing)]).toEqual([])
	})

	it('nenhuma tradução está vazia', () => {
		const empty = Object.entries(messagesByLocale).flatMap(([locale, messages]) =>
			collectKeys(messages)
				.filter((key) => {
					const resolved = key
						.split('.')
						.reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages)
					return resolved === ''
				})
				.map((key) => `${locale}:${key}`)
		)

		expect(empty).toEqual([])
	})
})
