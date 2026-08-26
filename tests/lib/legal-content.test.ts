import { readLegalMarkdown } from '@/lib/legal-content'

describe('readLegalMarkdown', () => {
	it('lê o documento no locale pedido', async () => {
		const english = await readLegalMarkdown('terms', 'en')
		expect(english).toContain('discourage using the platform for pornography')
		expect(english).toContain('commits to cooperating with legal authorities')

		const privacyEn = await readLegalMarkdown('privacy', 'en')
		expect(privacyEn).toContain('essential session, theme, and language cookies')

		const spanish = await readLegalMarkdown('privacy', 'es')
		expect(spanish).toContain('Denuncias y colaboración legal')
	})

	it('cai no português quando o locale é desconhecido', async () => {
		const fallback = await readLegalMarkdown('terms', 'fr')
		expect(fallback).toContain('desincentivam o uso da plataforma para pornografia')
		expect(fallback).toContain('compromete-se a colaborar com órgãos e entidades legais')
	})
})
