import { SessionEventType } from '@prisma/client'
import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import SessionEventRepository from '@/repositories/SessionEvent.repository'
import UserRepository from '@/repositories/User.repository'
import { NotFoundError, UnauthorizedError, ValidationError } from '@/errors'
import { getAppBaseUrl } from '@/config/env'
import { accountDeletionDeadline } from '@/constants/accountDeletion'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { buildAccountDeletionQuarantineMail } from '@/utils/emailMessages'
import { verifyPassword } from '@/utils/password'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import type { AppLocale } from '@/constants/texts'

type Input = {
	userId: string
	/** Required when the account has a password; omit/empty for Google-only. */
	currentPassword?: string
	locale?: AppLocale
	/** Sessão atual — blacklist do jti além de `sessionsRevokedAt`. */
	session?: {
		jti: string
		device: string
		exp?: number
	}
}

type Output = {
	ok: true
	deletedAt: Date
	deadlineAt: Date
}

/**
 * Puts the account in a 30-day reversible quarantine (`deletedAt`).
 * Does not anonymize, change password, soft-delete images, or delete Spaces objects.
 * Hard purge is done by the retention cron after the quarantine window.
 */
export default class DeleteUserAccount extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (input.currentPassword && input.currentPassword.length > PASSWORD_MAX_LENGTH) {
			throw new ValidationError('Password must be at most 128 characters')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findById(input.userId)

		if (!user) {
			throw new NotFoundError('User not found')
		}

		const hasPassword = Boolean(user.passwordHash)
		if (hasPassword) {
			if (!input.currentPassword) {
				throw new ValidationError('Current password is required')
			}
			const valid = await verifyPassword(user.passwordHash!, input.currentPassword)
			if (!valid) {
				throw new UnauthorizedError('Current password is invalid')
			}
		} else if (!user.googleLinkedAt) {
			throw new UnauthorizedError('Current password is invalid')
		}

		const quarantined = await userRepository.softDeleteQuarantine(user.id)

		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		await activeSessionRepository.deleteAllForUser(user.id)

		if (input.session) {
			const sessionEventRepository = new SessionEventRepository(injectables.prisma)
			const alreadyRevoked = await sessionEventRepository.existsForJti(input.session.jti)
			if (!alreadyRevoked) {
				await sessionEventRepository.create({
					jti: input.session.jti,
					event: SessionEventType.LOGOUT,
					device: input.session.device,
					exp: input.session.exp,
				})
			}
		}

		const deletedAt = quarantined.deletedAt ?? new Date()
		const deadlineAt = accountDeletionDeadline(deletedAt)
		const locale = input.locale ?? 'en'

		try {
			const mail = buildAccountDeletionQuarantineMail({
				locale,
				requestedAt: deletedAt,
				deadlineAt,
				appBaseUrl: getAppBaseUrl(),
			})
			await this.emailService.send({
				to: user.email,
				subject: mail.subject,
				text: mail.text,
			})
		} catch (error: unknown) {
			LogManager.error('Failed to send account deletion quarantine email', error)
		}

		return { ok: true, deletedAt, deadlineAt }
	}
}
