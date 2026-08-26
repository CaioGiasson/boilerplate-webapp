import type { EmailSendInput, EmailSendResult } from '@/services/Email/email.types'

/**
 * Use-case-facing email port (DI-04). Default adapter: `EmailService` via `getEmailService()`.
 */
export type EmailPort = {
	send(input: EmailSendInput): Promise<EmailSendResult>
}
