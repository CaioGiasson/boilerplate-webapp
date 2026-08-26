import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { type PublicUser } from '@/repositories/User.repository'
import { NotFoundError, ValidationError } from '@/errors'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { getAppBaseUrl } from '@/config/env'
import { buildEmailVerificationMail } from '@/utils/emailMessages'
import { createEmailToken, emailTokenExpiresAt } from '@/utils/emailToken'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'

type Input = {
	userId: string
	locale?: string
}

type Output = {
	user: PublicUser
	sent: boolean
}

/**
 * Issues (or re-issues) a signup/account verification challenge to the current email.
 */
export default class SendEmailVerification extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findById(input.userId.trim())
		if (!user) {
			throw new NotFoundError('User not found')
		}

		if (user.emailVerifiedAt) {
			return { user: await toPublicUserWithSignedPhoto(user), sent: false }
		}

		const { token, hash } = createEmailToken()
		const updated = await userRepository.setEmailChallenge(user.id, {
			tokenHash: hash,
			purpose: 'verify',
			expiresAt: emailTokenExpiresAt(),
			pendingEmail: null,
		})

		const mail = buildEmailVerificationMail({
			appBaseUrl: getAppBaseUrl(),
			locale: input.locale?.trim() || 'en',
			token,
			purpose: 'verify',
		})
		await this.emailService.send({
			to: user.email,
			subject: mail.subject,
			text: mail.text,
		})

		return { user: await toPublicUserWithSignedPhoto(updated), sent: true }
	}
}
