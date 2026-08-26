import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import UserRepository, { type PublicUser } from '@/repositories/User.repository'
import { UnauthorizedError, ValidationError } from '@/errors'
import { getJwtTtlSeconds } from '@/config/env'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { buildNewLoginMail } from '@/utils/emailMessages'
import { verifyGoogleOAuthPendingToken } from '@/utils/googleOAuthCookies'
import { verifyPassword } from '@/utils/password'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import { resolveSessionDeviceId, signSessionToken } from '@/utils/session'
import { safeReturnUrl } from '@/utils/safeReturnUrl'

type Input = {
	password: string
	pendingCookie?: string | null
	deviceCookie?: string | null
}

type Output = {
	user: PublicUser
	token: string
	ttlSeconds: number
	device: string
	returnUrl: string
}

/**
 * Links Google to an existing password account after the user confirms with their current password.
 * Does not overwrite name/photo.
 */
export default class LinkGoogleAccount extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.pendingCookie?.trim()) {
			throw new UnauthorizedError('Missing Google link session')
		}
		if (!input.password) {
			throw new ValidationError('Password is required')
		}
		if (input.password.length > PASSWORD_MAX_LENGTH) {
			throw new ValidationError('Password must be at most 128 characters')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const pending = await verifyGoogleOAuthPendingToken(input.pendingCookie!.trim())
		if (pending.flow !== 'link' || !pending.userId) {
			throw new UnauthorizedError('Invalid Google link session')
		}

		const userRepository = new UserRepository(injectables.prisma)
		// Resolve by userId from callback (supports match via current or pending email).
		const user = await userRepository.findById(pending.userId)
		if (!user) {
			throw new UnauthorizedError('Invalid credentials')
		}
		if (!user.passwordHash) {
			throw new UnauthorizedError('Invalid credentials')
		}

		const valid = await verifyPassword(user.passwordHash, input.password)
		if (!valid) {
			throw new UnauthorizedError('Invalid credentials')
		}

		let working = user

		if (pending.emailChangeCancelled) {
			working = await userRepository.clearEmailChangeChallenge(working.id)
		}

		if (!working.googleLinkedAt) {
			working = await userRepository.linkGoogle(working.id)
		}

		if (pending.emailVerified && !working.emailVerifiedAt) {
			working = await userRepository.markEmailVerified(working.id)
		} else if ((pending.googleEmailUnverified || !pending.emailVerified) && working.emailVerifiedAt) {
			working = await userRepository.clearEmailVerified(working.id)
		}

		const device = resolveSessionDeviceId(input.deviceCookie)
		const { token, jti, exp } = await signSessionToken({
			userId: working.id,
			device,
		})

		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		await activeSessionRepository.create({
			userId: working.id,
			jti,
			device,
			exp,
		})

		if (working.emailVerifiedAt) {
			try {
				const mail = buildNewLoginMail()
				await this.emailService.send({
					to: working.email,
					subject: mail.subject,
					text: mail.text,
				})
			} catch (error: unknown) {
				LogManager.error('Failed to send new-login email after Google link', error)
			}
		}

		try {
			await userRepository.updateLastLoginDevice(working.id, device)
		} catch (error: unknown) {
			LogManager.error('Failed to persist lastLoginDevice after Google link', error)
		}

		return {
			user: await toPublicUserWithSignedPhoto(working),
			token,
			ttlSeconds: getJwtTtlSeconds(),
			device,
			returnUrl: safeReturnUrl(pending.returnUrl),
		}
	}
}
