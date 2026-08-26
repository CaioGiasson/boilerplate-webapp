export type EmailSendInput = {
	to: string
	subject: string
	html?: string
	text?: string
	replyTo?: string
}

export type EmailSendResult = {
	messageId?: string
	provider: string
}

/**
 * Vendor-specific delivery adapter. Callers must use EmailService, not this port directly.
 */
export type EmailDeliveryPort = {
	send(input: EmailSendInput): Promise<EmailSendResult>
}
