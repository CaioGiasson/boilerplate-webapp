import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository, { isUniqueConstraintError, type PublicUser } from '@/repositories/User.repository'
import { ConflictError, NotFoundError, ValidationError } from '@/errors'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { getAppBaseUrl } from '@/config/env'
import { buildAccountVerifiedMail, buildEmailVerificationMail } from '@/utils/emailMessages'
import {
	EMAIL_CODE_LENGTH,
	createEmailToken,
	emailTokenExpiresAt,
	hashEmailToken,
	normalizeEmailToken,
} from '@/utils/emailToken'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import LogManager from '@/managers/Log.manager'

type Input = {
	token: string
	locale?: string
}

type Output = {
	user: PublicUser
}

/**
 * Consumes an email challenge token (verify | change_old | change_new).
 */
export default class ConfirmEmailChallenge extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		const code = normalizeEmailToken(input.token ?? '')
		if (code.length !== EMAIL_CODE_LENGTH) {
			throw new ValidationError(`A valid ${EMAIL_CODE_LENGTH}-character code is required`)
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const hash = hashEmailToken(input.token)
		const user = await userRepository.findByEmailTokenHash(hash)
		if (!user || !user.emailTokenPurpose || !user.emailTokenExpiresAt) {
			throw new NotFoundError('Invalid or expired token')
		}
		if (user.emailTokenExpiresAt.getTime() < Date.now()) {
			await userRepository.clearEmailChallenge(user.id)
			throw new ValidationError('Invalid or expired token')
		}

		const locale = input.locale?.trim() || 'en'

		if (user.emailTokenPurpose === 'verify') {
			const updated = await userRepository.markEmailVerified(user.id)
			try {
				const mail = buildAccountVerifiedMail()
				await this.emailService.send({
					to: updated.email,
					subject: mail.subject,
					text: mail.text,
				})
			} catch (error: unknown) {
				LogManager.error('Failed to send account-verified email', error)
			}
			return { user: await toPublicUserWithSignedPhoto(updated) }
		}

		if (user.emailTokenPurpose === 'change_old') {
			if (!user.pendingEmail) {
				throw new ValidationError('Invalid or expired token')
			}
			const { token, hash: nextHash } = createEmailToken()
			const updated = await userRepository.setEmailChallenge(user.id, {
				tokenHash: nextHash,
				purpose: 'change_new',
				expiresAt: emailTokenExpiresAt(),
				pendingEmail: user.pendingEmail,
			})
			const mail = buildEmailVerificationMail({
				appBaseUrl: getAppBaseUrl(),
				locale,
				token,
				purpose: 'change_new',
			})
			await this.emailService.send({
				to: user.pendingEmail,
				subject: mail.subject,
				text: mail.text,
			})
			return { user: await toPublicUserWithSignedPhoto(updated) }
		}

		if (user.emailTokenPurpose === 'change_new') {
			if (!user.pendingEmail) {
				throw new ValidationError('Invalid or expired token')
			}
			try {
				const updated = await userRepository.applyPendingEmail(user.id, user.pendingEmail)
				return { user: await toPublicUserWithSignedPhoto(updated) }
			} catch (error: unknown) {
				if (isUniqueConstraintError(error)) {
					throw new ConflictError('Could not complete email change')
				}
				throw error
			}
		}

		throw new ValidationError('Invalid or expired token')
	}
}
