import { randomBytes } from 'node:crypto'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { isGoogleOAuthReady, requireGoogleOAuthConfig } from '@/config/env'
import { ServiceUnavailableError, ValidationError } from '@/errors'
import { getGoogleOAuthService } from '@/services/GoogleOAuth/GoogleOAuth.service'
import type { GoogleOAuthPort } from '@/services/GoogleOAuth/googleOAuth.port'
import { GOOGLE_OAUTH_COOKIE_TTL_SECONDS, signGoogleOAuthStateToken } from '@/utils/googleOAuthCookies'
import { safeReturnUrl } from '@/utils/safeReturnUrl'

type Input = {
	returnUrl?: string | null
}

type Output = {
	authorizeUrl: string
	stateToken: string
	ttlSeconds: number
}

export default class StartGoogleOAuth extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	constructor(private readonly googleOAuth: GoogleOAuthPort = getGoogleOAuthService()) {
		super()
	}

	async validate(_input: Input): Promise<void> {
		if (!isGoogleOAuthReady()) {
			throw new ServiceUnavailableError('Google OAuth is not configured')
		}
		// Touch require to fail fast on incomplete runtime config.
		requireGoogleOAuthConfig()
	}

	async execute(input: Input, _injectables: Injectables): Promise<Output> {
		const returnUrl = safeReturnUrl(input.returnUrl)
		const state = randomBytes(32).toString('hex')
		const stateToken = await signGoogleOAuthStateToken({ state, returnUrl })
		const authorizeUrl = this.googleOAuth.buildAuthorizeUrl(state)

		if (!authorizeUrl?.startsWith('https://')) {
			throw new ValidationError('Invalid Google authorize URL')
		}

		return {
			authorizeUrl,
			stateToken,
			ttlSeconds: GOOGLE_OAUTH_COOKIE_TTL_SECONDS,
		}
	}
}
