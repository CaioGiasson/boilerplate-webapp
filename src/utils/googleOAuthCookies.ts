import { SignJWT, jwtVerify } from 'jose'
import { getJwtAudience, getJwtIssuer, getJwtSecret } from '@/config/env'
import { UnauthorizedError } from '@/errors'
import { isSecureSessionCookie, type SessionCookieRequestContext } from '@/utils/session'
import { safeReturnUrl } from '@/utils/safeReturnUrl'

export const GOOGLE_OAUTH_STATE_COOKIE = 'vitraux-google-oauth'
export const GOOGLE_OAUTH_PENDING_COOKIE = 'vitraux-google-pending'
export const GOOGLE_OAUTH_COOKIE_TTL_SECONDS = 10 * 60

export const GOOGLE_OAUTH_STATE_PURPOSE = 'google_oauth_state'
export const GOOGLE_OAUTH_PENDING_PURPOSE = 'google_oauth_pending'

export type GoogleOAuthPendingFlow = 'register' | 'link'

export type GoogleOAuthStateClaims = {
	state: string
	returnUrl: string
}

export type GoogleOAuthPendingClaims = {
	flow: GoogleOAuthPendingFlow
	email: string
	/** Present for `link` — Vitraux user id resolved at callback (may differ from Google email when matched via pendingEmail). */
	userId: string | null
	name: string | null
	picture: string | null
	emailVerified: boolean
	returnUrl: string
	/** Deferred side effects applied only after password confirmation on link. */
	emailChangeCancelled: boolean
	googleEmailUnverified: boolean
}

type CookieJar = {
	get(name: string): { value: string } | undefined
}

type MutableCookies = {
	set(
		name: string,
		value: string,
		options: {
			httpOnly?: boolean
			secure?: boolean
			sameSite?: 'lax' | 'strict' | 'none'
			path?: string
			maxAge?: number
		}
	): unknown
}

function cookieOptions(maxAgeSeconds: number, context?: SessionCookieRequestContext) {
	return {
		httpOnly: true,
		secure: isSecureSessionCookie(context),
		sameSite: 'lax' as const,
		path: '/',
		maxAge: maxAgeSeconds,
	}
}

export async function signGoogleOAuthStateToken(claims: GoogleOAuthStateClaims): Promise<string> {
	const nowSeconds = Math.floor(Date.now() / 1000)
	return new SignJWT({
		purpose: GOOGLE_OAUTH_STATE_PURPOSE,
		state: claims.state,
		returnUrl: safeReturnUrl(claims.returnUrl),
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer(getJwtIssuer())
		.setAudience(getJwtAudience())
		.setIssuedAt(nowSeconds)
		.setExpirationTime(nowSeconds + GOOGLE_OAUTH_COOKIE_TTL_SECONDS)
		.sign(getJwtSecret())
}

export async function verifyGoogleOAuthStateToken(token: string): Promise<GoogleOAuthStateClaims> {
	try {
		const { payload } = await jwtVerify(token, getJwtSecret(), {
			issuer: getJwtIssuer(),
			audience: getJwtAudience(),
		})
		if (payload.purpose !== GOOGLE_OAUTH_STATE_PURPOSE) {
			throw new UnauthorizedError('Invalid OAuth state')
		}
		const state = typeof payload.state === 'string' ? payload.state : null
		const returnUrl = typeof payload.returnUrl === 'string' ? payload.returnUrl : '/'
		if (!state) {
			throw new UnauthorizedError('Invalid OAuth state')
		}
		return { state, returnUrl: safeReturnUrl(returnUrl) }
	} catch (error: unknown) {
		if (error instanceof UnauthorizedError) {
			throw error
		}
		throw new UnauthorizedError('Invalid OAuth state')
	}
}

export async function signGoogleOAuthPendingToken(claims: GoogleOAuthPendingClaims): Promise<string> {
	const nowSeconds = Math.floor(Date.now() / 1000)
	if (claims.flow === 'link' && !claims.userId?.trim()) {
		throw new UnauthorizedError('Invalid Google link session')
	}
	return new SignJWT({
		purpose: GOOGLE_OAUTH_PENDING_PURPOSE,
		flow: claims.flow,
		email: claims.email,
		userId: claims.userId,
		name: claims.name,
		picture: claims.picture,
		emailVerified: claims.emailVerified,
		returnUrl: safeReturnUrl(claims.returnUrl),
		emailChangeCancelled: claims.emailChangeCancelled === true,
		googleEmailUnverified: claims.googleEmailUnverified === true,
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer(getJwtIssuer())
		.setAudience(getJwtAudience())
		.setIssuedAt(nowSeconds)
		.setExpirationTime(nowSeconds + GOOGLE_OAUTH_COOKIE_TTL_SECONDS)
		.sign(getJwtSecret())
}

export async function verifyGoogleOAuthPendingToken(token: string): Promise<GoogleOAuthPendingClaims> {
	try {
		const { payload } = await jwtVerify(token, getJwtSecret(), {
			issuer: getJwtIssuer(),
			audience: getJwtAudience(),
		})
		if (payload.purpose !== GOOGLE_OAUTH_PENDING_PURPOSE) {
			throw new UnauthorizedError('Invalid Google registration session')
		}
		const flow = payload.flow === 'register' || payload.flow === 'link' ? payload.flow : null
		const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null
		const returnUrl = typeof payload.returnUrl === 'string' ? payload.returnUrl : '/'
		const userId = typeof payload.userId === 'string' && payload.userId.trim() ? payload.userId.trim() : null
		if (!flow || !email) {
			throw new UnauthorizedError('Invalid Google registration session')
		}
		if (flow === 'link' && !userId) {
			throw new UnauthorizedError('Invalid Google link session')
		}
		return {
			flow,
			email,
			userId,
			name: typeof payload.name === 'string' ? payload.name : null,
			picture: typeof payload.picture === 'string' ? payload.picture : null,
			emailVerified: payload.emailVerified === true,
			returnUrl: safeReturnUrl(returnUrl),
			emailChangeCancelled: payload.emailChangeCancelled === true,
			googleEmailUnverified: payload.googleEmailUnverified === true,
		}
	} catch (error: unknown) {
		if (error instanceof UnauthorizedError) {
			throw error
		}
		throw new UnauthorizedError('Invalid Google registration session')
	}
}

export function applyGoogleOAuthStateCookie(
	cookies: MutableCookies,
	token: string,
	context?: SessionCookieRequestContext
): void {
	cookies.set(GOOGLE_OAUTH_STATE_COOKIE, token, cookieOptions(GOOGLE_OAUTH_COOKIE_TTL_SECONDS, context))
}

export function clearGoogleOAuthStateCookie(cookies: MutableCookies, context?: SessionCookieRequestContext): void {
	cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', cookieOptions(0, context))
}

export function readGoogleOAuthStateCookie(cookies: CookieJar): string | null {
	return cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? null
}

export function applyGoogleOAuthPendingCookie(
	cookies: MutableCookies,
	token: string,
	context?: SessionCookieRequestContext
): void {
	cookies.set(GOOGLE_OAUTH_PENDING_COOKIE, token, cookieOptions(GOOGLE_OAUTH_COOKIE_TTL_SECONDS, context))
}

export function clearGoogleOAuthPendingCookie(cookies: MutableCookies, context?: SessionCookieRequestContext): void {
	cookies.set(GOOGLE_OAUTH_PENDING_COOKIE, '', cookieOptions(0, context))
}

export function readGoogleOAuthPendingCookie(cookies: CookieJar): string | null {
	return cookies.get(GOOGLE_OAUTH_PENDING_COOKIE)?.value ?? null
}
