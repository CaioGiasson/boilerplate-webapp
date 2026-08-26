import EmailService from '@/services/Email/Email.service'
import { ValidationError } from '@/errors'
import type { EmailConfig } from '@/config/env'
import type { EmailDeliveryPort } from '@/services/Email/email.types'

const baseConfig = (): EmailConfig => ({
	provider: 'none',
	from: '',
	timeoutMs: 10_000,
	brevoApiKey: '',
	brevoApiBaseUrl: 'https://api.brevo.com',
	brevoSandbox: false,
})

describe('EmailService', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('usa noop quando EMAIL_PROVIDER=none', async () => {
		const service = new EmailService(baseConfig())
		expect(service.getProvider()).toBe('none')
		const result = await service.send({
			to: 'user@example.com',
			subject: 'Hello',
			text: 'Body',
		})
		expect(result).toEqual({ provider: 'none', messageId: 'noop' })
	})

	it('delega ao delivery injetado (provider brevo)', async () => {
		const delivery: EmailDeliveryPort = {
			send: jest.fn(async () => ({ provider: 'brevo', messageId: 'msg-1' })),
		}
		const service = new EmailService(
			{
				...baseConfig(),
				provider: 'brevo',
				from: 'noreply@app.test',
				brevoApiKey: 'key',
			},
			delivery
		)
		const result = await service.send({
			to: 'user@example.com',
			subject: 'Hi',
			html: '<p>Hi</p>',
		})
		expect(result.messageId).toBe('msg-1')
		expect(delivery.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@example.com',
				subject: 'Hi',
				html: '<p>Hi</p>',
			})
		)
	})

	it('rejeita destinatário inválido', async () => {
		const service = new EmailService(baseConfig())
		await expect(service.send({ to: 'not-an-email', subject: 'x', text: 'y' })).rejects.toBeInstanceOf(
			ValidationError
		)
	})

	it('exige html ou text', async () => {
		const service = new EmailService(baseConfig())
		await expect(service.send({ to: 'user@example.com', subject: 'x' })).rejects.toBeInstanceOf(ValidationError)
	})

	it('recusa brevo sem API key na construção', () => {
		expect(
			() =>
				new EmailService({
					...baseConfig(),
					provider: 'brevo',
					from: 'noreply@app.test',
					brevoApiKey: '',
				})
		).toThrow('BREVO_API_KEY')
	})

	it('recusa none em production-like', () => {
		process.env.ENVIRONMENT = 'prod'
		expect(() => new EmailService(baseConfig())).toThrow('not allowed in production-like')
	})
})
