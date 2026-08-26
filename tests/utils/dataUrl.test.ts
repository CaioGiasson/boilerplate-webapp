import { ValidationError } from '@/errors'
import {
	assertJsonBodyNotTooLarge,
	estimateBase64DecodedBytes,
	IMAGE_JSON_BODY_MAX_BYTES,
	normalizeImageMime,
	readJsonBodyCapped,
	parseImageDataUrl,
} from '@/utils/dataUrl'

describe('dataUrl', () => {
	it('estima bytes decodificados com padding', () => {
		expect(estimateBase64DecodedBytes('AAAA')).toBe(3)
		expect(estimateBase64DecodedBytes('AAA=')).toBe(2)
		expect(estimateBase64DecodedBytes('AA==')).toBe(1)
	})

	it('normaliza image/jpg para image/jpeg', () => {
		expect(normalizeImageMime('image/jpg')).toBe('image/jpeg')
		expect(normalizeImageMime('IMAGE/JPEG')).toBe('image/jpeg')
	})

	it('rejeita base64 acima do teto sem Buffer.from', () => {
		const maxDecodedBytes = 10
		const tooLong = 'A'.repeat(Math.ceil(((maxDecodedBytes + 1) * 4) / 3))
		expect(estimateBase64DecodedBytes(tooLong)).toBeGreaterThan(maxDecodedBytes)

		const fromSpy = jest.spyOn(Buffer, 'from')
		try {
			expect(() => parseImageDataUrl(`data:image/jpeg;base64,${tooLong}`, maxDecodedBytes)).toThrow(
				ValidationError
			)
			expect(fromSpy.mock.calls.some((call) => (call as unknown[])[1] === 'base64')).toBe(false)
		} finally {
			fromSpy.mockRestore()
		}
	})

	it('rejeita HTML rotulado como image/jpeg', () => {
		const html = Buffer.from('<html>not-an-image')
		const dataUrl = `data:image/jpeg;base64,${html.toString('base64')}`
		expect(() => parseImageDataUrl(dataUrl, 1024)).toThrow(ValidationError)
	})

	it('rejeita mismatch de MIME declarado vs magic bytes', () => {
		const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
		const dataUrl = `data:image/png;base64,${jpeg.toString('base64')}`
		expect(() => parseImageDataUrl(dataUrl, 1024)).toThrow(ValidationError)
	})

	it('aceita jpeg declarado como image/jpg', () => {
		const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
		const parsed = parseImageDataUrl(`data:image/jpg;base64,${jpeg.toString('base64')}`, 1024)
		expect(parsed.mimeType).toBe('image/jpeg')
		expect(parsed.buffer.equals(jpeg)).toBe(true)
	})

	it('rejeita Content-Length acima de ~4MB', () => {
		expect(() => assertJsonBodyNotTooLarge(String(IMAGE_JSON_BODY_MAX_BYTES + 1))).toThrow(ValidationError)
		expect(() => assertJsonBodyNotTooLarge(String(IMAGE_JSON_BODY_MAX_BYTES))).not.toThrow()
	})

	it('para de ler o body quando passa do teto, mesmo sem Content-Length', async () => {
		const request = new Request('http://localhost/upload', {
			method: 'POST',
			body: 'x'.repeat(64),
		})
		await expect(readJsonBodyCapped(request, 16)).rejects.toBeInstanceOf(ValidationError)
	})

	it('faz parse de JSON dentro do teto', async () => {
		const request = new Request('http://localhost/upload', {
			method: 'POST',
			body: '{"image":"ok"}',
			headers: { 'Content-Type': 'application/json' },
		})
		await expect(readJsonBodyCapped(request, 1024)).resolves.toEqual({ image: 'ok' })
	})
})
