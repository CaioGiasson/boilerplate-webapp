import { appErrorMessageForLocale, resolveAppErrorLocale } from '@/lib/errors/appErrorCopy'
import { messagesByLocale } from '@/constants/texts'

describe('resolveAppErrorLocale', () => {
	it('prioriza o cookie válido', () => {
		expect(resolveAppErrorLocale({ cookieLocale: 'es', pathname: '/en/profile' })).toBe('es')
	})

	it('cai no primeiro segmento do caminho quando o cookie é inválido', () => {
		expect(resolveAppErrorLocale({ cookieLocale: 'xx', pathname: '/en/profile' })).toBe('en')
	})

	it('usa o locale padrão sem pistas', () => {
		expect(resolveAppErrorLocale({ cookieLocale: null, pathname: '/' })).toBe('pt')
		expect(resolveAppErrorLocale({})).toBe('pt')
	})
})

describe('appErrorMessageForLocale', () => {
	it.each(['pt', 'en', 'es'] as const)('usa título e descrição do catálogo %s', (locale) => {
		const { title, description } = messagesByLocale[locale].error
		expect(appErrorMessageForLocale(locale)).toBe(`${title}\n\n${description}`)
	})
})
