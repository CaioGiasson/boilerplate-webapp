import { NextRequest, NextResponse } from 'next/server'
import HandleGoogleOAuthCallback from '@/useCases/handleGoogleOAuthCallback.usecase'
import { handleRoute } from '@/utils/routeHandler'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import {
	applyGoogleOAuthPendingCookie,
	clearGoogleOAuthStateCookie,
	readGoogleOAuthStateCookie,
} from '@/utils/googleOAuthCookies'
import { applyDeviceCookie, applySessionCookie, readDeviceCookieValue } from '@/utils/session'

type Dependencies = {
	handleGoogleOAuthCallbackUseCase: HandleGoogleOAuthCallback
}

export default async function googleCallbackRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertAuthRateLimit(request, 'google-callback')

		const code = request.nextUrl.searchParams.get('code')
		const state = request.nextUrl.searchParams.get('state')
		const result = await dependencies.handleGoogleOAuthCallbackUseCase.run({
			code,
			state,
			stateCookie: readGoogleOAuthStateCookie(request.cookies),
			deviceCookie: readDeviceCookieValue(request.cookies),
		})

		const redirectUrl = new URL(result.redirectPath, request.nextUrl.origin)
		const response = NextResponse.redirect(redirectUrl, { status: 302 })
		clearGoogleOAuthStateCookie(response.cookies, request)

		if (result.kind === 'session' || result.kind === 'deletion_decision') {
			applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
			applyDeviceCookie(response.cookies, result.device, request)
			return response
		}

		applyGoogleOAuthPendingCookie(response.cookies, result.pendingToken, request)
		return response
	})
}
