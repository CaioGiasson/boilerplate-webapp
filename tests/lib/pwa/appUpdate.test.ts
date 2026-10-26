import { parseServerVersion, shouldDeferReload, shouldForceAppUpdate } from '@/lib/pwa/appUpdate'

describe('parseServerVersion', () => {
	it('lê a versão do envelope da API', () => {
		expect(parseServerVersion({ success: true, data: { version: ' 1.2.3 ' } })).toBe('1.2.3')
	})

	it.each([
		null,
		undefined,
		'x',
		1,
		{},
		{ data: null },
		{ data: {} },
		{ data: { version: 3 } },
		{ data: { version: '  ' } },
	])('devolve null para %p', (body) => {
		expect(parseServerVersion(body)).toBeNull()
	})
})

describe('shouldForceAppUpdate', () => {
	it('qualquer diferença força atualização', () => {
		expect(shouldForceAppUpdate('1.0.0', '1.0.1')).toBe(true)
		expect(shouldForceAppUpdate('1.0.0', '0.9.0')).toBe(true)
		expect(shouldForceAppUpdate('1.0.0', '1.0.0')).toBe(false)
	})
})

describe('shouldDeferReload', () => {
	function element(tagName: string, isContentEditable = false) {
		return { tagName, isContentEditable } as unknown as Element
	}

	it('adia enquanto a pessoa digita', () => {
		expect(shouldDeferReload(element('INPUT'))).toBe(true)
		expect(shouldDeferReload(element('TEXTAREA'))).toBe(true)
		expect(shouldDeferReload(element('SELECT'))).toBe(true)
		expect(shouldDeferReload(element('DIV', true))).toBe(true)
	})

	it('não adia sem foco em campo editável', () => {
		expect(shouldDeferReload(null)).toBe(false)
		expect(shouldDeferReload(element('BODY'))).toBe(false)
		expect(shouldDeferReload(element('BUTTON'))).toBe(false)
	})
})
