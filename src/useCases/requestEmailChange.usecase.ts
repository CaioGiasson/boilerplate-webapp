import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { type PublicUser } from '@/repositories/User.repository'
import { NotFoundError, ValidationError } from '@/errors'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { getAppBaseUrl } from '@/config/env'
import { buildEmailVerificationMail } from '@/utils/emailMessages'
import { createEmailToken, emailTokenExpiresAt } from '@/utils/emailToken'
import { verifyPassword } from '@/utils/password'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Input = {
	userId: string
	password: string
	newEmail: string
	locale?: string
}

type Output = {
	user: PublicUser
	/** True when the account was Google-linked — completing the change will unlink Google. */
	willUnlinkGoogle: boolean
}

/**
 * Starts email change: password + new email → challenge to the *current* address (change_old).
 */
export default class RequestEmailChange extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (!input.password) {
			throw new ValidationError('Password is required')
		}
		const newEmail = input.newEmail?.trim().toLowerCase() ?? ''
		if (!EMAIL_PATTERN.test(newEmail)) {
			throw new ValidationError('A valid new email is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findById(input.userId.trim())
		if (!user) {
			throw new NotFoundError('User not found')
		}

		if (!user.passwordHash) {
			if (user.googleLinkedAt) {
				throw new ValidationError(
					'Set a password before changing email, or contact support.',
					'PASSWORD_REQUIRED'
				)
			}
			throw new ValidationError('This account cannot change email. Contact support.', 'ACCOUNT_SUPPORT_REQUIRED')
		}

		const ok = await verifyPassword(user.passwordHash, input.password)
		if (!ok) {
			throw new ValidationError('Current password is incorrect')
		}

		if (!user.emailVerifiedAt) {
			throw new ValidationError('Verify your current email before changing it')
		}

		const newEmail = input.newEmail.trim().toLowerCase()
		if (newEmail === user.email.toLowerCase()) {
			throw new ValidationError('New email must be different')
		}

		const existing = await userRepository.findByEmail(newEmail)
		if (existing) {
			// Generic — avoid oracle (SEC-I03)
			throw new ValidationError('Could not start email change')
		}

		const { token, hash } = createEmailToken()
		const updated = await userRepository.setEmailChallenge(user.id, {
			tokenHash: hash,
			purpose: 'change_old',
			expiresAt: emailTokenExpiresAt(),
			pendingEmail: newEmail,
		})

		const mail = buildEmailVerificationMail({
			appBaseUrl: getAppBaseUrl(),
			locale: input.locale?.trim() || 'en',
			token,
			purpose: 'change_old',
		})
		await this.emailService.send({
			to: user.email,
			subject: mail.subject,
			text: mail.text,
		})

		return {
			user: await toPublicUserWithSignedPhoto(updated),
			willUnlinkGoogle: Boolean(user.googleLinkedAt),
		}
	}
}
