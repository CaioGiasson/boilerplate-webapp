import { ServiceError } from '@/errors'
import LogManager from '@/managers/Log.manager'
import { maskEmail } from '@/utils/maskEmail'
import type { BrevoEmailConfig } from '@/config/env'
import type { EmailDeliveryPort, EmailSendInput, EmailSendResult } from '@/services/Email/email.types'
import { brevoCircuitBreaker } from '@/services/resilience/externalBreakers'
import { isRetryableHttpStatus, retryWithJitter } from '@/utils/retryWithJitter'

type FetchLike = typeof fetch

/**
 * Brevo Transactional Email API adapter (HTTPS). Used only via EmailService.
 */
export default class BrevoService implements EmailDeliveryPort {
	constructor(
		private readonly config: BrevoEmailConfig,
		private readonly fetchImpl: FetchLike = fetch
	) {}

	async send(input: EmailSendInput): Promise<EmailSendResult> {
		return brevoCircuitBreaker.execute(() =>
			retryWithJitter(() => this.sendOnce(input), {
				shouldRetry: (error) => isRetryableBrevoError(error),
				onRetry: (_error, attempt, delayMs) => {
					LogManager.info('Retrying Brevo send', { attempt, delayMs, to: maskEmail(input.to) })
				},
			})
		)
	}

	private async sendOnce(input: EmailSendInput): Promise<EmailSendResult> {
		const base = this.config.apiBaseUrl.replace(/\/$/, '')
		const url = `${base}/v3/smtp/email`
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

		const headers: Record<string, string> = {
			accept: 'application/json',
			'content-type': 'application/json',
			'api-key': this.config.apiKey,
		}

		const body: Record<string, unknown> = {
			sender: {
				email: this.config.from,
				...(this.config.fromName ? { name: this.config.fromName } : {}),
			},
			to: [{ email: input.to.trim() }],
			subject: input.subject,
		}

		if (input.html?.trim()) {
			body.htmlContent = input.html
		}
		if (input.text?.trim()) {
			body.textContent = input.text
		}
		if (input.replyTo?.trim()) {
			body.replyTo = { email: input.replyTo.trim() }
		}
		if (this.config.sandbox) {
			body.headers = { 'X-Sib-Sandbox': 'drop' }
		}

		try {
			const response = await this.fetchImpl(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
				signal: controller.signal,
			})

			if (!response.ok) {
				const detail = await safeReadBody(response)
				LogManager.error('Brevo transactional email failed', {
					status: response.status,
					to: maskEmail(input.to),
					detail: detail.slice(0, 200),
				})
				if (isRetryableHttpStatus(response.status)) {
					throw new RetryableHttpError(response.status, 'Brevo returned retryable status')
				}
				throw new ServiceError('Failed to send email via Brevo')
			}

			const payload = (await response.json().catch(() => ({}))) as { messageId?: string }
			return {
				provider: 'brevo',
				messageId: typeof payload.messageId === 'string' ? payload.messageId : undefined,
			}
		} catch (error: unknown) {
			if (error instanceof ServiceError || error instanceof RetryableHttpError) {
				throw error
			}
			if (isAbortError(error)) {
				LogManager.error('Brevo transactional email timed out', { to: maskEmail(input.to) })
				throw new ServiceError('Email provider request timed out', error)
			}
			LogManager.error('Brevo transactional email request failed', error)
			throw new ServiceError('Failed to send email via Brevo', error)
		} finally {
			clearTimeout(timer)
		}
	}
}

class RetryableHttpError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly cause?: unknown
	) {
		super(message)
		this.name = 'RetryableHttpError'
	}
}

function isRetryableBrevoError(error: unknown): boolean {
	if (error instanceof RetryableHttpError) {
		return isRetryableHttpStatus(error.status)
	}
	return false
}

async function safeReadBody(response: Response): Promise<string> {
	try {
		return await response.text()
	} catch {
		return ''
	}
}

function isAbortError(error: unknown): boolean {
	return (
		(error instanceof Error && error.name === 'AbortError') ||
		(typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')
	)
}
