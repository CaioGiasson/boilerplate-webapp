import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import UserRepository, { type PublicUser } from '@/repositories/User.repository'
import { UnauthorizedError, ValidationError } from '@/errors'
import { getJwtTtlSeconds } from '@/config/env'
import { accountDeletionDeadline, isWithinAccountDeletionQuarantine } from '@/constants/accountDeletion'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { buildNewLoginMail } from '@/utils/emailMessages'
import { verifyPasswordOrDummy } from '@/utils/password'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { resolveSessionDeviceId, signSessionToken } from '@/utils/session'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import type { SettingEntry } from '@/managers/Settings.manager'
import SettingsManager from '@/managers/Settings.manager'

type Input = {
	identifier: string
	password: string
	/** UUID do cookie HttpOnly `vitraux-device` (server-side). Ignorar body do cliente. */
	deviceCookie?: string | null
}

type SessionOutput = {
	kind: 'session'
	user: PublicUser
	token: string
	ttlSeconds: number
	settings: SettingEntry[]
	device: string
}

type DeletionDecisionOutput = {
	kind: 'deletion_decision'
	token: string
	ttlSeconds: number
	device: string
	deletedAt: Date
	deadlineAt: Date
}

type Output = SessionOutput | DeletionDecisionOutput

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * New-login alert heuristic (SEC-I15-C):
 * Resolve device from the HttpOnly device cookie (or mint one). If `emailVerifiedAt`
 * is set and (`lastLoginDevice` is null or differs), send `buildNewLoginMail`
 * best-effort, then persist `lastLoginDevice`. Unverified accounts never get the alert.
 * Same browser keeps the same device cookie across logins → no alert spam.
 */
export default class LoginUser extends UseCaseMasterPort<Input, Output> {
	constructor(private readonly emailService: EmailPort = getEmailService()) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.identifier?.trim() || !input.password) {
			throw new ValidationError('Identifier and password are required')
		}
		if (input.password.length > PASSWORD_MAX_LENGTH) {
			throw new ValidationError('Password must be at most 128 characters')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const identifier = input.identifier.trim()
		const user = EMAIL_PATTERN.test(identifier)
			? await userRepository.findByEmailIncludingDeleted(identifier)
			: await userRepository.findByNicknameIncludingDeleted(identifier)

		const valid = await verifyPasswordOrDummy(user?.passwordHash ?? null, input.password)
		if (!user || !valid) {
			if (user && !user.deletedAt && !user.passwordHash && user.googleLinkedAt) {
				throw new UnauthorizedError('Sign in with Google for this account', 'GOOGLE_LOGIN_REQUIRED')
			}
			throw new UnauthorizedError('Invalid credentials')
		}

		if (user.deletedAt) {
			if (!isWithinAccountDeletionQuarantine(user.deletedAt)) {
				throw new UnauthorizedError('Invalid credentials')
			}

			const device = resolveSessionDeviceId(input.deviceCookie)
			const { token, jti, exp } = await signSessionToken({
				userId: user.id,
				device,
			})

			const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
			await activeSessionRepository.create({
				userId: user.id,
				jti,
				device,
				exp,
			})

			return {
				kind: 'deletion_decision',
				token,
				ttlSeconds: getJwtTtlSeconds(),
				device,
				deletedAt: user.deletedAt,
				deadlineAt: accountDeletionDeadline(user.deletedAt),
			}
		}

		if (!user.passwordHash && user.googleLinkedAt) {
			throw new UnauthorizedError('Sign in with Google for this account', 'GOOGLE_LOGIN_REQUIRED')
		}

		const device = resolveSessionDeviceId(input.deviceCookie)
		const { token, jti, exp } = await signSessionToken({
			userId: user.id,
			device,
		})

		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		await activeSessionRepository.create({
			userId: user.id,
			jti,
			device,
			exp,
		})

		const isNewDevice = user.lastLoginDevice == null || user.lastLoginDevice !== device
		if (user.emailVerifiedAt && isNewDevice) {
			try {
				const mail = buildNewLoginMail()
				await this.emailService.send({
					to: user.email,
					subject: mail.subject,
					text: mail.text,
				})
			} catch (error: unknown) {
				LogManager.error('Failed to send new-login email', error)
			}
		}

		try {
			await userRepository.updateLastLoginDevice(user.id, device)
		} catch (error: unknown) {
			LogManager.error('Failed to persist lastLoginDevice after login', error)
		}

		return {
			kind: 'session',
			user: await toPublicUserWithSignedPhoto(user),
			token,
			ttlSeconds: getJwtTtlSeconds(),
			settings: SettingsManager.list(user),
			device,
		}
	}
}
