import { createHash } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { getJwtAudience, getJwtIssuer, getJwtSecret, getJwtTtlSeconds } from '@/config/env'
import { UnauthorizedError } from '@/errors'

export const HTTP_SESSION_COOKIE_NAME = 'app-session'
export const HOST_SESSION_COOKIE_NAME = '__Host-app-session'
export const DEVICE_COOKIE_NAME = 'app-device'
/** Persistência do device server-side (alerta de novo login / SEC-I13). */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

const DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Sessão emitida por admin para atuar como outro usuário; curta, sem renovação e sem `ActiveSession`. */
export const SESSION_TYPE_IMPERSONATION = 'IMPERSONATION'
export const IMPERSONATION_DEVICE = 'Admin Impersonation'
export const IMPERSONATION_TTL_SECONDS = 10 * 60

export type SessionType = typeof SESSION_TYPE_IMPERSONATION

export type SessionClaims = {
	userId: string
	device: string
	sessionType?: SessionType
	/** Id do admin que emitiu a sessão de impersonamento. */
	impersonatedBy?: string
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
export async function signSessionToken(
	claims: SessionClaims,
	options: { ttlSeconds?: number } = {}
): Promise<SignedSessionToken> {
	const ttlSeconds = options.ttlSeconds ?? getJwtTtlSeconds()
	const jti = crypto.randomUUID()
	const nowSeconds = Math.floor(Date.now() / 1000)
	const exp = nowSeconds + ttlSeconds

	const token = await new SignJWT({
		userId: claims.userId,
		device: claims.device,
		...(claims.sessionType ? { sessionType: claims.sessionType } : {}),
		...(claims.impersonatedBy ? { impersonatedBy: claims.impersonatedBy } : {}),
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

		const sessionType = payload.sessionType === SESSION_TYPE_IMPERSONATION ? SESSION_TYPE_IMPERSONATION : undefined
		const impersonatedBy = typeof payload.impersonatedBy === 'string' ? payload.impersonatedBy : undefined

		return {
			userId,
			device,
			token,
			jti,
			exp,
			iat,
			...(sessionType ? { sessionType } : {}),
			...(impersonatedBy ? { impersonatedBy } : {}),
		}
	} catch {
		throw new UnauthorizedError('Invalid session token')
	}
}

/** Emite o JWT de impersonamento (10 min, sem renovação). O consumo é feito por `POST /api/v1/auth/impersonate`. */
export function signImpersonationToken(input: { userId: string; adminId: string }): Promise<SignedSessionToken> {
	return signSessionToken(
		{
			userId: input.userId,
			device: IMPERSONATION_DEVICE,
			sessionType: SESSION_TYPE_IMPERSONATION,
			impersonatedBy: input.adminId,
		},
		{ ttlSeconds: IMPERSONATION_TTL_SECONDS }
	)
}

export function isImpersonationSession(session: Pick<SessionClaims, 'sessionType'>): boolean {
	return session.sessionType === SESSION_TYPE_IMPERSONATION
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

/**
 * Remove os cookies de sessão e, por padrão, o de device. Em sessão de impersonamento use `keepDevice`:
 * o device do navegador não pertence ao alvo e apagá-lo geraria alerta de novo login.
 */
export function clearSessionCookies(
	cookies: MutableCookies,
	_context?: SessionCookieRequestContext,
	options: { keepDevice?: boolean } = {}
): void {
	expireLegacySessionCookies(cookies)
	if (!options.keepDevice) {
		expireDeviceCookies(cookies)
	}
}
