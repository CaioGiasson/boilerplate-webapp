jest.mock('undici', () => ({
	Agent: class {},
	fetch: globalThis.fetch,
}))

import RemoteImageService from '@/services/Image/RemoteImage.service'
import { ValidationError } from '@/errors'

const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

describe('RemoteImageService', () => {
	it('rejeita hostname que resolve para IP privado', async () => {
		const service = new RemoteImageService(async () => [{ address: '127.0.0.1' }], fetch)
		await expect(service.fetch('https://evil.example.com/a.jpg')).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita se qualquer endereço resolvido for privado', async () => {
		const service = new RemoteImageService(async () => [{ address: '1.1.1.1' }, { address: '10.0.0.1' }], fetch)
		await expect(service.fetch('https://evil.example.com/a.jpg')).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita corpo que não é imagem', async () => {
		const pngish = new Response('hello-html', {
			status: 200,
			headers: { 'content-type': 'image/png' },
		})
		const service = new RemoteImageService(
			async () => [{ address: '1.1.1.1' }],
			async () => pngish
		)
		await expect(service.fetch('https://cdn.example.com/a.png')).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita redirect para IP privado', async () => {
		const service = new RemoteImageService(
			async () => [{ address: '1.1.1.1' }],
			async (input) => {
				if (String(input).includes('cdn.example.com')) {
					return new Response(null, {
						status: 302,
						headers: { location: 'http://127.0.0.1/secret.png' },
					})
				}
				throw new Error('should not fetch the private redirect target')
			}
		)
		await expect(service.fetch('https://cdn.example.com/a.png')).rejects.toBeInstanceOf(ValidationError)
	})

	it('rejeita redirect para IPv4-mapped IPv6', async () => {
		const service = new RemoteImageService(
			async () => [{ address: '1.1.1.1' }],
			async (input) => {
				if (String(input).includes('cdn.example.com')) {
					return new Response(null, {
						status: 302,
						headers: { location: 'http://[::ffff:7f00:1]/secret.png' },
					})
				}
				throw new Error('should not fetch the mapped redirect target')
			}
		)
		await expect(service.fetch('https://cdn.example.com/a.png')).rejects.toBeInstanceOf(ValidationError)
	})

	it('converte falha de DNS em ValidationError', async () => {
		const service = new RemoteImageService(async () => {
			throw Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' })
		}, fetch)
		await expect(service.fetch('https://missing.example.com/a.jpg')).rejects.toBeInstanceOf(ValidationError)
	})

	it('converte falha de rede em ValidationError', async () => {
		const service = new RemoteImageService(
			async () => [{ address: '1.1.1.1' }],
			async () => {
				throw new Error('network down')
			}
		)
		await expect(service.fetch('https://cdn.example.com/a.jpg')).rejects.toBeInstanceOf(ValidationError)
	})

	it('aceita jpeg público', async () => {
		const service = new RemoteImageService(
			async () => [{ address: '1.1.1.1' }],
			async () =>
				new Response(jpegBytes, {
					status: 200,
					headers: { 'content-type': 'text/html' },
				})
		)
		await expect(service.fetch('https://cdn.example.com/a.jpg')).resolves.toEqual({
			buffer: jpegBytes,
			mimeType: 'image/jpeg',
		})
	})
})
