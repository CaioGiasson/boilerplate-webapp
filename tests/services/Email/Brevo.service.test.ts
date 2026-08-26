jest.mock('@/services/resilience/externalBreakers', () => ({
	brevoCircuitBreaker: {
		execute: (fn: () => Promise<unknown>) => fn(),
	},
}))
import BrevoService from '@/services/Email/Brevo.service'
import { ServiceError } from '@/errors'
import type { BrevoEmailConfig } from '@/config/env'

const config = (overrides: Partial<BrevoEmailConfig> = {}): BrevoEmailConfig => ({
	apiKey: 'test-key',
	apiBaseUrl: 'https://api.brevo.com',
	from: 'noreply@app.test',
	fromName: 'App',
	timeoutMs: 5_000,
	sandbox: false,
	...overrides,
})

describe('BrevoService', () => {
	it('POST /v3/smtp/email com api-key e payload', async () => {
		const fetchImpl = jest.fn(
			async () => new Response(JSON.stringify({ messageId: '<abc@smtp>' }), { status: 201 })
		)
		const service = new BrevoService(config(), fetchImpl as unknown as typeof fetch)
		const result = await service.send({
			to: 'user@example.com',
			subject: 'Subject',
			text: 'Plain',
			html: '<p>Html</p>',
			replyTo: 'support@app.test',
		})

		expect(result).toEqual({ provider: 'brevo', messageId: '<abc@smtp>' })
		expect(fetchImpl).toHaveBeenCalledTimes(1)
		const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
		expect(url).toBe('https://api.brevo.com/v3/smtp/email')
		expect(init.method).toBe('POST')
		const headers = init.headers as Record<string, string>
		expect(headers['api-key']).toBe('test-key')
		const body = JSON.parse(String(init.body))
		expect(body).toMatchObject({
			sender: { email: 'noreply@app.test', name: 'App' },
			to: [{ email: 'user@example.com' }],
			subject: 'Subject',
			textContent: 'Plain',
			htmlContent: '<p>Html</p>',
			replyTo: { email: 'support@app.test' },
		})
		expect(body.headers).toBeUndefined()
	})

	it('inclui X-Sib-Sandbox quando sandbox=true', async () => {
		const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ messageId: 'x' }), { status: 201 }))
		const service = new BrevoService(config({ sandbox: true }), fetchImpl as unknown as typeof fetch)
		await service.send({ to: 'user@example.com', subject: 'S', text: 'T' })
		const body = JSON.parse(String((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body))
		expect(body.headers).toEqual({ 'X-Sib-Sandbox': 'drop' })
	})

	it('lança ServiceError em HTTP não-OK', async () => {
		const fetchImpl = jest.fn(async () => new Response('nope', { status: 401 }))
		const service = new BrevoService(config(), fetchImpl as unknown as typeof fetch)
		await expect(service.send({ to: 'user@example.com', subject: 'S', text: 'T' })).rejects.toBeInstanceOf(
			ServiceError
		)
	})

	it('lança ServiceError em timeout/abort', async () => {
		const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => {
					const err = new Error('aborted')
					err.name = 'AbortError'
					reject(err)
				})
			})
		})
		const service = new BrevoService(config({ timeoutMs: 20 }), fetchImpl as unknown as typeof fetch)
		await expect(service.send({ to: 'user@example.com', subject: 'S', text: 'T' })).rejects.toBeInstanceOf(
			ServiceError
		)
	})
})
