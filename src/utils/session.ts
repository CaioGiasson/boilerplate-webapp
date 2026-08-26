import { createHash } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { getJwtAudience, getJwtIssuer, getJwtSecret, getJwtTtlSeconds } from '@/config/env'
import { UnauthorizedError } from '@/errors'

export const HTTP_SESSION_COOKIE_NAME = 'vitraux-session'
export const HOST_SESSION_COOKIE_NAME = '__Host-vitraux-session'
export const DEVICE_COOKIE_NAME = 'vitraux-device'
/** Persistência do device server-side (alerta de novo login / SEC-I13). */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

const DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SessionClaims = {
	userId: string
	device: string
}

export type VerifiedSession = SessionClaims & {
	token: string
	jti: string
	exp: number
	iat: number
}

export type SessionCookieRequestContext = {
	headers?: { get(name: string): string | null }
	url?: string
	secure?: boolean
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

export function hashSessionJti(jti: string): string {
	return createHash('sha256').update(jti).digest('hex')
}

export type SignedSessionToken = {
	token: string
	jti: string
	/** Unix seconds */
	exp: number
}

/**
 * Emite JWT de sessão com userId, device e jti.
 */
export async function signSessionToken(claims: SessionClaims): Promise<SignedSessionToken> {
	const ttlSeconds = getJwtTtlSeconds()
	const jti = crypto.randomUUID()
	const nowSeconds = Math.floor(Date.now() / 1000)
	const exp = nowSeconds + ttlSeconds

	const token = await new SignJWT({
		userId: claims.userId,
		device: claims.device,
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setJti(jti)
		.setIssuer(getJwtIssuer())
		.setAudience(getJwtAudience())
		.setIssuedAt(nowSeconds)
		.setExpirationTime(exp)
		.sign(getJwtSecret())

	return { token, jti, exp }
}

/**
 * Verifica assinatura e expiração do JWT. Não consulta SessionEvents.
 */
export async function verifySessionToken(token: string): Promise<VerifiedSession> {
	try {
		const { payload } = await jwtVerify(token, getJwtSecret(), {
			issuer: getJwtIssuer(),
			audience: getJwtAudience(),
		})
		const userId = typeof payload.userId === 'string' ? payload.userId : null
		const device = typeof payload.device === 'string' ? payload.device : null
		const exp = typeof payload.exp === 'number' ? payload.exp : null
		const iat = typeof payload.iat === 'number' ? payload.iat : null
		const jti = typeof payload.jti === 'string' ? payload.jti : null

		if (!userId || !device || !exp || !iat || !jti) {
			throw new UnauthorizedError('Invalid session token')
		}

		return { userId, device, token, jti, exp, iat }
	} catch {
		throw new UnauthorizedError('Invalid session token')
	}
}

export function createSessionDeviceId(): string {
	return crypto.randomUUID()
}

/**
 * Reusa UUID de device do cookie HttpOnly se válido; senão emite um novo.
 * Nunca confiar em `device` enviado no body pelo cliente.
 */
export function resolveSessionDeviceId(existingDeviceId?: string | null): string {
	const trimmed = existingDeviceId?.trim()
	if (trimmed && DEVICE_ID_PATTERN.test(trimmed)) {
		return trimmed
	}
	return createSessionDeviceId()
}

export function readDeviceCookieValue(cookies: CookieJar): string | null {
	return cookies.get(DEVICE_COOKIE_NAME)?.value ?? null
}

export function applyDeviceCookie(
	cookies: MutableCookies,
	deviceId: string,
	context?: SessionCookieRequestContext
): void {
	cookies.set(DEVICE_COOKIE_NAME, deviceId, {
		httpOnly: true,
		secure: isSecureSessionCookie(context),
		sameSite: 'lax',
		path: '/',
		maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
	})
}

/**
 * Secure when production (assumed TLS) or the inbound request is HTTPS
 * (`x-forwarded-proto` / request URL). Local HTTP keeps Secure=false so the cookie can be stored.
 */
export function isSecureSessionCookie(context?: SessionCookieRequestContext): boolean {
	if (typeof context?.secure === 'boolean') {
		return context.secure
	}
	if (process.env.NODE_ENV === 'production') {
		return true
	}
	const forwarded = context?.headers?.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
	if (forwarded === 'https') {
		return true
	}
	if (context?.url) {
		try {
			return new URL(context.url).protocol === 'https:'
		} catch {
			return false
		}
	}
	return false
}

export function getSessionCookieName(context?: SessionCookieRequestContext): string {
	return isSecureSessionCookie(context) ? HOST_SESSION_COOKIE_NAME : HTTP_SESSION_COOKIE_NAME
}

export function getSessionCookieOptions(maxAgeSeconds: number, context?: SessionCookieRequestContext) {
	return {
		httpOnly: true,
		secure: isSecureSessionCookie(context),
		sameSite: 'lax' as const,
		path: '/',
		maxAge: maxAgeSeconds,
	}
}

export function readSessionCookieValue(cookies: CookieJar): string | null {
	return cookies.get(HOST_SESSION_COOKIE_NAME)?.value ?? cookies.get(HTTP_SESSION_COOKIE_NAME)?.value ?? null
}

function expireCookie(cookies: MutableCookies, name: string, secure: boolean) {
	cookies.set(name, '', {
		httpOnly: true,
		secure,
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
	})
}

function expireLegacySessionCookies(cookies: MutableCookies): void {
	expireCookie(cookies, HTTP_SESSION_COOKIE_NAME, false)
	expireCookie(cookies, HTTP_SESSION_COOKIE_NAME, true)
	expireCookie(cookies, HOST_SESSION_COOKIE_NAME, true)
}

function expireDeviceCookies(cookies: MutableCookies): void {
	expireCookie(cookies, DEVICE_COOKIE_NAME, false)
	expireCookie(cookies, DEVICE_COOKIE_NAME, true)
}

export function applySessionCookie(
	cookies: MutableCookies,
	token: string,
	maxAgeSeconds: number,
	context?: SessionCookieRequestContext
): void {
	const options = getSessionCookieOptions(maxAgeSeconds, context)
	expireLegacySessionCookies(cookies)
	cookies.set(getSessionCookieName(context), token, options)
}

export function clearSessionCookies(cookies: MutableCookies, _context?: SessionCookieRequestContext): void {
	expireLegacySessionCookies(cookies)
	expireDeviceCookies(cookies)
}
