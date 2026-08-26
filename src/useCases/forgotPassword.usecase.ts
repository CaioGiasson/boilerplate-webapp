import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository from '@/repositories/User.repository'
import { ValidationError } from '@/errors'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { getAppBaseUrl } from '@/config/env'
import { buildPasswordResetMail } from '@/utils/emailMessages'
import { createEmailToken, emailTokenExpiresAt } from '@/utils/emailToken'

type Input = {
	email: string
	locale?: string
}

type Output = {
	ok: true
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Starts password reset when the account is active and email-verified.
 * Always returns the same generic outcome (SEC-I03 / SEC-I15-R).
 */
export default class ForgotPassword extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		const email = input.email?.trim().toLowerCase() ?? ''
		if (!email || !EMAIL_PATTERN.test(email)) {
			throw new ValidationError('A valid email is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const email = input.email.trim().toLowerCase()
		const user = await userRepository.findByEmail(email)

		if (user?.emailVerifiedAt) {
			const { token, hash } = createEmailToken()
			await userRepository.setEmailChallenge(user.id, {
				tokenHash: hash,
				purpose: 'password_reset',
				expiresAt: emailTokenExpiresAt(),
				pendingEmail: null,
			})

			const mail = buildPasswordResetMail({
				appBaseUrl: getAppBaseUrl(),
				locale: input.locale?.trim() || 'en',
				token,
			})
			try {
				await this.emailService.send({
					to: user.email,
					subject: mail.subject,
					text: mail.text,
				})
			} catch (error: unknown) {
				// Always same HTTP outcome (SEC-I03); do not leak delivery failure.
				LogManager.error('Failed to send password-reset email', error)
			}
		}

		return { ok: true }
	}
}
