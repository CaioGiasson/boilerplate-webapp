import { ValidationError } from '@/errors'
import { isBlockedHostname, isBlockedIp, parsePublicHttpUrl, sniffImageMime } from '@/utils/safeImageUrl'

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

	it.each([
		'10.0.0.1',
		'172.16.0.1',
		'192.168.1.1',
		'169.254.169.254',
		'100.64.0.1',
		'192.0.2.1',
		'198.51.100.1',
		'203.0.113.1',
		'198.18.0.1',
		'224.0.0.1',
		'240.0.0.1',
		'255.255.255.255',
		'0.0.0.0',
		'2001::1',
		'2001:db8::1',
		'fe80::1',
		'fd00::1',
		'ff02::1',
		'64:ff9b::7f00:1',
		'2002:7f00:1::',
	])('bloqueia o IP reservado %s', (ip) => {
		expect(isBlockedIp(ip)).toBe(true)
	})

	it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111'])('libera o IP público %s', (ip) => {
		expect(isBlockedIp(ip)).toBe(false)
	})

	it.each(['999.1.1.1', '0177.0.0.1', '127.1', '0x7f.0.0.1', '2130706433'])(
		'bloqueia literal de IP malformado ou ofuscado %s',
		(host) => {
			expect(isBlockedIp(host)).toBe(true)
		}
	)

	it('não trata nome de host com quatro ou mais rótulos como IP', () => {
		expect(isBlockedIp('static.cdn.example.com')).toBe(false)
		expect(parsePublicHttpUrl('https://static.cdn.example.com/a.png').hostname).toBe('static.cdn.example.com')
	})

	it.each(['localhost', 'app.localhost', 'printer.local', 'metadata.google.internal', 'host.internal', 'localhost.'])(
		'bloqueia o nome de host %s',
		(host) => {
			expect(isBlockedHostname(host)).toBe(true)
		}
	)

	it('libera nomes públicos', () => {
		expect(isBlockedHostname('example.com')).toBe(false)
	})

	it('reconhece magic bytes de imagem', () => {
		expect(
			sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
		).toBe('image/jpeg')
		expect(sniffImageMime(Buffer.from('not-an-image-at-all'))).toBe(null)
	})
})
