import type { UserEntity } from '@/repositories/User.dto'
import type { GoogleUserInfo } from '@/services/GoogleOAuth/googleOAuth.port'

export type GoogleCallbackFlags = {
	emailChangeCancelled: boolean
	googleEmailUnverified: boolean
}

export type GoogleCallbackDecision =
	| { action: 'session'; linkGoogle: boolean; markVerified: boolean; clearVerified: boolean }
	| { action: 'pending_link' }
	| { action: 'pending_register' }
	| { action: 'deletion_decision' }

export function hasPendingEmailChange(user: UserEntity): boolean {
	if (user.pendingEmail) {
		return true
	}
	const purpose = user.emailTokenPurpose
	return purpose === 'change_old' || purpose === 'change_new'
}

/**
 * Pure decision for Google OAuth callback after user lookup.
 * Side effects (DB writes, cookies) are applied by the use case.
 *
 * `matchedBy: 'pendingEmail'` means Google's email equals a pending email-change target,
 * not the account's current email. In that case never treat `googleLinkedAt` as proof of
 * identity for this Google address (link was for another email) — always require password.
 */
export function decideGoogleOAuthCallback(input: {
	user: UserEntity | null
	google: Pick<GoogleUserInfo, 'emailVerified'>
	matchedBy?: 'email' | 'pendingEmail'
}): { decision: GoogleCallbackDecision; flags: GoogleCallbackFlags } {
	const flags: GoogleCallbackFlags = {
		emailChangeCancelled: false,
		googleEmailUnverified: false,
	}

	const user = input.user
	if (!user) {
		return { decision: { action: 'pending_register' }, flags }
	}

	if (user.deletedAt) {
		return { decision: { action: 'deletion_decision' }, flags }
	}

	if (hasPendingEmailChange(user)) {
		flags.emailChangeCancelled = true
	}

	if (!input.google.emailVerified && user.emailVerifiedAt) {
		flags.googleEmailUnverified = true
	}

	// Pending-email-only match: attacker could own the pending address while the victim
	// still has Google linked under their current email — never auto-session.
	if (input.matchedBy === 'pendingEmail') {
		return { decision: { action: 'pending_link' }, flags }
	}

	if (user.googleLinkedAt) {
		return {
			decision: {
				action: 'session',
				linkGoogle: false,
				markVerified: input.google.emailVerified && !user.emailVerifiedAt,
				clearVerified: flags.googleEmailUnverified,
			},
			flags,
		}
	}

	if (user.passwordHash) {
		return { decision: { action: 'pending_link' }, flags }
	}

	// Existing account without password — link Google and sign in.
	return {
		decision: {
			action: 'session',
			linkGoogle: true,
			markVerified: input.google.emailVerified && !user.emailVerifiedAt,
			clearVerified: flags.googleEmailUnverified,
		},
		flags,
	}
}

export function appendCallbackFlags(path: string, flags: GoogleCallbackFlags): string {
	const url = new URL(path, 'https://vitraux.invalid')
	if (flags.emailChangeCancelled) {
		url.searchParams.set('emailChangeCancelled', '1')
	}
	if (flags.googleEmailUnverified) {
		url.searchParams.set('googleEmailUnverified', '1')
	}
	return `${url.pathname}${url.search}${url.hash}`
}
