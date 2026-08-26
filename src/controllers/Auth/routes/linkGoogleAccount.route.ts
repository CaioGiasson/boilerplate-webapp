import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import LinkGoogleAccount from '@/useCases/linkGoogleAccount.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { clearGoogleOAuthPendingCookie, readGoogleOAuthPendingCookie } from '@/utils/googleOAuthCookies'
import { applyDeviceCookie, applySessionCookie, readDeviceCookieValue } from '@/utils/session'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'

type Dependencies = {
	linkGoogleAccountUseCase: LinkGoogleAccount
}

const bodySchema = z.object({
	password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
})

export default async function linkGoogleAccountRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		assertAuthRateLimit(request, 'google-link')

		const body = await parseJsonBodyUnknown(request)
		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.linkGoogleAccountUseCase.run({
			password: parsed.data.password,
			pendingCookie: readGoogleOAuthPendingCookie(request.cookies),
			deviceCookie: readDeviceCookieValue(request.cookies),
		})

		const response = NextResponse.json(
			ApiPresenter.success('Google account linked', {
				user: result.user,
				returnUrl: result.returnUrl,
			}),
			{ status: 200 }
		)
		applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
		applyDeviceCookie(response.cookies, result.device, request)
		clearGoogleOAuthPendingCookie(response.cookies, request)
		return response
	})
}
