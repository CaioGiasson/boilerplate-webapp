import { ServiceError, ValidationError } from '@/errors'
import { assertEmailConfig, getEmailConfig, type EmailConfig, type EmailProviderName } from '@/config/env'
import BrevoService from '@/services/Email/Brevo.service'
import type { EmailDeliveryPort, EmailSendInput, EmailSendResult } from '@/services/Email/email.types'
import type { EmailPort } from '@/services/Email/email.port'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Public email facade. Use cases must call this — never a vendor adapter directly.
 */
let sharedEmailService: EmailService | undefined

/** Process-wide email facade (reuses Brevo/noop delivery). Prefer over `new` per request. */
export function getEmailService(): EmailPort {
	if (!sharedEmailService) {
		sharedEmailService = new EmailService()
	}
	return sharedEmailService
}

/** Test hook — reset or inject a stub between cases. */
export function setEmailServiceForTests(service: EmailPort | undefined): void {
	sharedEmailService = service as EmailService | undefined
}

export default class EmailService {
	private readonly delivery: EmailDeliveryPort
	private readonly provider: EmailProviderName

	constructor(config: EmailConfig = getEmailConfig(), delivery?: EmailDeliveryPort) {
		assertEmailConfig(config)
		this.provider = config.provider
		this.delivery = delivery ?? createDelivery(config)
	}

	async send(input: EmailSendInput): Promise<EmailSendResult> {
		const to = input.to?.trim() ?? ''
		const subject = input.subject?.trim() ?? ''
		const html = input.html?.trim()
		const text = input.text?.trim()

		if (!to || !EMAIL_PATTERN.test(to)) {
			throw new ValidationError('A valid recipient email is required')
		}
		if (!subject) {
			throw new ValidationError('Email subject is required')
		}
		if (!html && !text) {
			throw new ValidationError('Email html or text body is required')
		}
		if (input.replyTo?.trim() && !EMAIL_PATTERN.test(input.replyTo.trim())) {
			throw new ValidationError('A valid replyTo email is required')
		}

		return this.delivery.send({
			to,
			subject,
			html: html || undefined,
			text: text || undefined,
			replyTo: input.replyTo?.trim() || undefined,
		})
	}

	getProvider(): EmailProviderName {
		return this.provider
	}
}

function createDelivery(config: EmailConfig): EmailDeliveryPort {
	switch (config.provider) {
		case 'brevo':
			return new BrevoService({
				apiKey: config.brevoApiKey,
				apiBaseUrl: config.brevoApiBaseUrl,
				from: config.from,
				fromName: config.fromName,
				timeoutMs: config.timeoutMs,
				sandbox: config.brevoSandbox,
			})
		case 'none':
		case 'disabled':
			return {
				async send(): Promise<EmailSendResult> {
					return { provider: config.provider, messageId: 'noop' }
				},
			}
		default: {
			const unknown = config.provider as string
			throw new ServiceError(`Unsupported EMAIL_PROVIDER: ${unknown}`)
		}
	}
}
