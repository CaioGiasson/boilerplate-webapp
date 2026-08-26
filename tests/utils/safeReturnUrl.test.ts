import { safeReturnUrl } from '@/utils/safeReturnUrl'

describe('safeReturnUrl', () => {
	it('aceita path relativo simples', () => {
		expect(safeReturnUrl('/perfil')).toBe('/perfil')
		expect(safeReturnUrl('/login?next=1')).toBe('/login?next=1')
		expect(safeReturnUrl('/a#hash')).toBe('/a#hash')
	})

	it('rejeita protocol-relative e URLs absolutas', () => {
		expect(safeReturnUrl('//evil.com')).toBe('/')
		expect(safeReturnUrl('https://evil.com')).toBe('/')
		expect(safeReturnUrl('http://evil.com/x')).toBe('/')
	})

	it('usa fallback para vazio, null ou path inválido', () => {
		expect(safeReturnUrl(null)).toBe('/')
		expect(safeReturnUrl(undefined)).toBe('/')
		expect(safeReturnUrl('')).toBe('/')
		expect(safeReturnUrl('  ')).toBe('/')
		expect(safeReturnUrl('perfil')).toBe('/')
		expect(safeReturnUrl('\\windows')).toBe('/')
	})

	it('respeita fallback customizado', () => {
		expect(safeReturnUrl('//x', '/home')).toBe('/home')
	})
})
