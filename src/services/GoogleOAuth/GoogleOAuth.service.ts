import { getGoogleOAuthConfig, isGoogleOAuthReady, type GoogleOAuthConfig } from '@/config/env'
import { IntegrationError, ServiceUnavailableError, ValidationError } from '@/errors'
import type { GoogleOAuthPort, GoogleUserInfo } from '@/services/GoogleOAuth/googleOAuth.port'

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const SCOPES = 'openid email profile'

let sharedGoogleOAuthService: GoogleOAuthService | undefined

/** Process-wide Google OAuth facade. Prefer over `new` per request. */
export function getGoogleOAuthService(): GoogleOAuthPort {
	if (!sharedGoogleOAuthService) {
		sharedGoogleOAuthService = new GoogleOAuthService()
	}
	return sharedGoogleOAuthService
}

/** Test hook — reset or inject a stub between cases. */
export function setGoogleOAuthServiceForTests(service: GoogleOAuthPort | undefined): void {
	sharedGoogleOAuthService = service as GoogleOAuthService | undefined
}

type FetchFn = typeof fetch

export default class GoogleOAuthService implements GoogleOAuthPort {
	private readonly config: GoogleOAuthConfig
	private readonly fetchImpl: FetchFn

	constructor(config: GoogleOAuthConfig = getGoogleOAuthConfig(), fetchImpl: FetchFn = fetch) {
		this.config = config
		this.fetchImpl = fetchImpl
	}

	buildAuthorizeUrl(state: string): string {
		const config = this.requireConfig()
		const url = new URL(GOOGLE_AUTHORIZE_URL)
		url.searchParams.set('client_id', config.clientId)
		url.searchParams.set('redirect_uri', config.redirectUri)
		url.searchParams.set('response_type', 'code')
		url.searchParams.set('scope', SCOPES)
		url.searchParams.set('state', state)
		url.searchParams.set('access_type', 'online')
		url.searchParams.set('include_granted_scopes', 'true')
		url.searchParams.set('prompt', 'select_account')
		return url.toString()
	}

	async exchangeCode(code: string): Promise<{ accessToken: string }> {
		const config = this.requireConfig()
		const trimmed = code?.trim()
		if (!trimmed) {
			throw new ValidationError('Authorization code is required')
		}

		const body = new URLSearchParams({
			code: trimmed,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: config.redirectUri,
			grant_type: 'authorization_code',
		})

		let response: Response
		try {
			response = await this.fetchImpl(GOOGLE_TOKEN_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body,
				signal: AbortSignal.timeout(config.timeoutMs),
			})
		} catch (error: unknown) {
			throw new IntegrationError('Google token exchange failed', error)
		}

		if (!response.ok) {
			throw new IntegrationError('Google token exchange failed')
		}

		const json = (await response.json()) as { access_token?: unknown }
		const accessToken = typeof json.access_token === 'string' ? json.access_token : null
		if (!accessToken) {
			throw new IntegrationError('Google token exchange returned no access_token')
		}
		return { accessToken }
	}

	async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
		const config = this.requireConfig()
		const token = accessToken?.trim()
		if (!token) {
			throw new ValidationError('Access token is required')
		}

		let response: Response
		try {
			response = await this.fetchImpl(GOOGLE_USERINFO_URL, {
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` },
				signal: AbortSignal.timeout(config.timeoutMs),
			})
		} catch (error: unknown) {
			throw new IntegrationError('Google userinfo failed', error)
		}

		if (!response.ok) {
			throw new IntegrationError('Google userinfo failed')
		}

		const json = (await response.json()) as {
			sub?: unknown
			email?: unknown
			email_verified?: unknown
			name?: unknown
			picture?: unknown
		}

		const sub = typeof json.sub === 'string' ? json.sub.trim() : ''
		const email = typeof json.email === 'string' ? json.email.trim().toLowerCase() : ''
		if (!sub || !email) {
			throw new IntegrationError('Google userinfo missing email or sub')
		}

		return {
			sub,
			email,
			emailVerified: json.email_verified === true || json.email_verified === 'true',
			name: typeof json.name === 'string' && json.name.trim() ? json.name.trim() : null,
			picture: typeof json.picture === 'string' && json.picture.trim() ? json.picture.trim() : null,
		}
	}

	private requireConfig(): GoogleOAuthConfig {
		if (!isGoogleOAuthReady(this.config)) {
			throw new ServiceUnavailableError('Google OAuth is not configured')
		}
		return this.config
	}
}
