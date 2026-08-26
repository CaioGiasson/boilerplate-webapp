import LogManager from '@/managers/Log.manager'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import UserRepository, { type PublicUser, type UserEntity } from '@/repositories/User.repository'
import { UnauthorizedError, ValidationError } from '@/errors'
import { getJwtTtlSeconds } from '@/config/env'
import { accountDeletionDeadline, isWithinAccountDeletionQuarantine } from '@/constants/accountDeletion'
import { getEmailService } from '@/services/Email/Email.service'
import type { EmailPort } from '@/services/Email/email.port'
import { getGoogleOAuthService } from '@/services/GoogleOAuth/GoogleOAuth.service'
import type { GoogleOAuthPort, GoogleUserInfo } from '@/services/GoogleOAuth/googleOAuth.port'
import { buildNewLoginMail } from '@/utils/emailMessages'
import {
	GOOGLE_OAUTH_COOKIE_TTL_SECONDS,
	signGoogleOAuthPendingToken,
	verifyGoogleOAuthStateToken,
	type GoogleOAuthPendingFlow,
} from '@/utils/googleOAuthCookies'
import {
	appendCallbackFlags,
	decideGoogleOAuthCallback,
	type GoogleCallbackFlags,
} from '@/utils/googleOAuthCallbackDecision'
import { toPublicUserWithSignedPhoto } from '@/utils/publicUserAccess'
import { resolveSessionDeviceId, signSessionToken } from '@/utils/session'
import { safeReturnUrl } from '@/utils/safeReturnUrl'

type Input = {
	code?: string | null
	state?: string | null
	stateCookie?: string | null
	deviceCookie?: string | null
}

export type GoogleOAuthCallbackSessionResult = {
	kind: 'session'
	user: PublicUser
	token: string
	ttlSeconds: number
	device: string
	redirectPath: string
	flags: GoogleCallbackFlags
}

export type GoogleOAuthCallbackPendingResult = {
	kind: 'pending'
	flow: GoogleOAuthPendingFlow
	pendingToken: string
	ttlSeconds: number
	redirectPath: string
	flags: GoogleCallbackFlags
}

export type GoogleOAuthCallbackDeletionDecisionResult = {
	kind: 'deletion_decision'
	token: string
	ttlSeconds: number
	device: string
	redirectPath: string
	deletedAt: Date
	deadlineAt: Date
	flags: GoogleCallbackFlags
}

type Output =
	| GoogleOAuthCallbackSessionResult
	| GoogleOAuthCallbackPendingResult
	| GoogleOAuthCallbackDeletionDecisionResult

export default class HandleGoogleOAuthCallback extends UseCaseMasterPort<Input, Output> {
	constructor(
		private readonly googleOAuth: GoogleOAuthPort = getGoogleOAuthService(),
		private readonly emailService: EmailPort = getEmailService()
	) {
		super()
	}

	async validate(input: Input): Promise<void> {
		if (!input.code?.trim()) {
			throw new ValidationError('Authorization code is required')
		}
		if (!input.state?.trim()) {
			throw new ValidationError('OAuth state is required')
		}
		if (!input.stateCookie?.trim()) {
			throw new UnauthorizedError('Missing OAuth state cookie')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const stateClaims = await verifyGoogleOAuthStateToken(input.stateCookie!.trim())
		if (stateClaims.state !== input.state!.trim()) {
			throw new UnauthorizedError('OAuth state mismatch')
		}

		const returnUrl = safeReturnUrl(stateClaims.returnUrl)
		const { accessToken } = await this.googleOAuth.exchangeCode(input.code!.trim())
		const google = await this.googleOAuth.fetchUserInfo(accessToken)

		const userRepository = new UserRepository(injectables.prisma)
		const resolved = await resolveUserByGoogleEmail(userRepository, google.email)
		const user = resolved?.user ?? null
		const { decision, flags } = decideGoogleOAuthCallback({
			user,
			google,
			matchedBy: resolved?.matchedBy,
		})

		if (decision.action === 'deletion_decision') {
			if (!user?.deletedAt || !isWithinAccountDeletionQuarantine(user.deletedAt)) {
				throw new UnauthorizedError('Invalid credentials')
			}
			return this.deletionDecisionResult(user, input.deviceCookie, flags, injectables)
		}

		if (decision.action === 'pending_register') {
			return this.pendingResult('register', google, returnUrl, flags, null)
		}

		if (decision.action === 'pending_link') {
			if (!user) {
				throw new UnauthorizedError('User not found for Google link')
			}
			// Do not mutate the account before password confirmation — link use case applies flags.
			return this.pendingResult('link', google, returnUrl, flags, user.id)
		}

		if (!user) {
			throw new UnauthorizedError('User not found for Google login')
		}

		let working: UserEntity = user

		if (flags.emailChangeCancelled) {
			working = await userRepository.clearEmailChangeChallenge(working.id)
		}

		if (decision.clearVerified) {
			working = await userRepository.clearEmailVerified(working.id)
		} else if (decision.markVerified) {
			working = await userRepository.markEmailVerified(working.id)
		}

		if (decision.linkGoogle) {
			working = await userRepository.linkGoogle(working.id)
		}

		return this.sessionResult(working, input.deviceCookie, returnUrl, flags, injectables)
	}

	private async pendingResult(
		flow: GoogleOAuthPendingFlow,
		google: GoogleUserInfo,
		returnUrl: string,
		flags: GoogleCallbackFlags,
		userId: string | null
	): Promise<GoogleOAuthCallbackPendingResult> {
		const pendingToken = await signGoogleOAuthPendingToken({
			flow,
			email: google.email,
			userId,
			name: google.name,
			picture: google.picture,
			emailVerified: google.emailVerified,
			returnUrl,
			emailChangeCancelled: flags.emailChangeCancelled,
			googleEmailUnverified: flags.googleEmailUnverified,
		})

		const basePath = flow === 'link' ? '/login/google/link' : '/register/google'
		return {
			kind: 'pending',
			flow,
			pendingToken,
			ttlSeconds: GOOGLE_OAUTH_COOKIE_TTL_SECONDS,
			redirectPath: appendCallbackFlags(basePath, flags),
			flags,
		}
	}

	private async deletionDecisionResult(
		user: UserEntity,
		deviceCookie: string | null | undefined,
		flags: GoogleCallbackFlags,
		injectables: Injectables
	): Promise<GoogleOAuthCallbackDeletionDecisionResult> {
		const device = resolveSessionDeviceId(deviceCookie)
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

		const deletedAt = user.deletedAt!
		return {
			kind: 'deletion_decision',
			token,
			ttlSeconds: getJwtTtlSeconds(),
			device,
			redirectPath: appendCallbackFlags('/account-delete?decision=1', flags),
			deletedAt,
			deadlineAt: accountDeletionDeadline(deletedAt),
			flags,
		}
	}

	private async sessionResult(
		user: UserEntity,
		deviceCookie: string | null | undefined,
		returnUrl: string,
		flags: GoogleCallbackFlags,
		injectables: Injectables
	): Promise<GoogleOAuthCallbackSessionResult> {
		const device = resolveSessionDeviceId(deviceCookie)
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

		// Google login: always send new-login alert when email is verified (best-effort).
		if (user.emailVerifiedAt) {
			try {
				const mail = buildNewLoginMail()
				await this.emailService.send({
					to: user.email,
					subject: mail.subject,
					text: mail.text,
				})
			} catch (error: unknown) {
				LogManager.error('Failed to send new-login email after Google login', error)
			}
		}

		try {
			const userRepository = new UserRepository(injectables.prisma)
			await userRepository.updateLastLoginDevice(user.id, device)
		} catch (error: unknown) {
			LogManager.error('Failed to persist lastLoginDevice after Google login', error)
		}

		return {
			kind: 'session',
			user: await toPublicUserWithSignedPhoto(user),
			token,
			ttlSeconds: getJwtTtlSeconds(),
			device,
			redirectPath: appendCallbackFlags(returnUrl, flags),
			flags,
		}
	}
}

async function resolveUserByGoogleEmail(
	userRepository: UserRepository,
	email: string
): Promise<{ user: UserEntity; matchedBy: 'email' | 'pendingEmail' } | null> {
	const byEmail = await userRepository.findByEmailIncludingDeleted(email)
	if (byEmail) {
		return { user: byEmail, matchedBy: 'email' }
	}
	const byPending = await userRepository.findByPendingEmail(email)
	if (byPending) {
		return { user: byPending, matchedBy: 'pendingEmail' }
	}
	return null
}
