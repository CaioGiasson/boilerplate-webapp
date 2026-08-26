import { NextRequest, NextResponse } from 'next/server'
import StartGoogleOAuth from '@/useCases/startGoogleOAuth.usecase'
import { handleRoute } from '@/utils/routeHandler'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { applyGoogleOAuthStateCookie } from '@/utils/googleOAuthCookies'

type Dependencies = {
	startGoogleOAuthUseCase: StartGoogleOAuth
}

export default async function googleStartRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertAuthRateLimit(request, 'google-start')

		const returnUrl = request.nextUrl.searchParams.get('returnUrl')
		const result = await dependencies.startGoogleOAuthUseCase.run({ returnUrl })

		const response = NextResponse.redirect(result.authorizeUrl, { status: 302 })
		applyGoogleOAuthStateCookie(response.cookies, result.stateToken, request)
		return response
	})
}
