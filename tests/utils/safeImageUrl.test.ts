import { ValidationError } from '@/errors'
import { isBlockedIp, parsePublicHttpUrl, sniffImageMime } from '@/utils/safeImageUrl'

describe('safeImageUrl', () => {
	it('aceita https público', () => {
		expect(parsePublicHttpUrl('https://cdn.example.com/a.jpg').hostname).toBe('cdn.example.com')
	})

	it('rejeita javascript e file', () => {
		expect(() => parsePublicHttpUrl('javascript:alert(1)')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('file:///etc/passwd')).toThrow(ValidationError)
	})

	it('rejeita localhost e IPs privados', () => {
		expect(() => parsePublicHttpUrl('http://localhost/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://127.0.0.1/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://192.168.0.10/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://10.0.0.2/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://169.254.169.254/latest')).toThrow(ValidationError)
	})

	it('rejeita 6to4, NAT64 e hostname numérico', () => {
		expect(() => parsePublicHttpUrl('http://[2002:7f00:1::]/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://[64:ff9b::7f00:1]/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://2130706433/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://0x7f000001/x.png')).toThrow(ValidationError)
		expect(isBlockedIp('2002:7f00:1::')).toBe(true)
		expect(isBlockedIp('64:ff9b::7f00:1')).toBe(true)
	})

	it('rejeita IPv4-mapped IPv6 (dotted e hex)', () => {
		expect(() => parsePublicHttpUrl('http://[::ffff:127.0.0.1]/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://[::ffff:7f00:1]/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://[::ffff:10.0.0.1]/x.png')).toThrow(ValidationError)
		expect(() => parsePublicHttpUrl('http://[::ffff:a00:1]/x.png')).toThrow(ValidationError)
	})

	it('rejeita credenciais na URL', () => {
		expect(() => parsePublicHttpUrl('https://user:pass@example.com/a.jpg')).toThrow(ValidationError)
	})

	it('marca IPs bloqueados', () => {
		expect(isBlockedIp('127.0.0.1')).toBe(true)
		expect(isBlockedIp('8.8.8.8')).toBe(false)
		expect(isBlockedIp('::1')).toBe(true)
		expect(isBlockedIp('[::ffff:7f00:1]')).toBe(true)
		expect(isBlockedIp('::ffff:a00:1')).toBe(true)
		expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false)
	})

	it('reconhece magic bytes de imagem', () => {
		expect(
			sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
		).toBe('image/jpeg')
		expect(sniffImageMime(Buffer.from('not-an-image-at-all'))).toBe(null)
	})
})
