import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import CompleteGoogleRegistration from '@/useCases/completeGoogleRegistration.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { clearGoogleOAuthPendingCookie, readGoogleOAuthPendingCookie } from '@/utils/googleOAuthCookies'
import { applyDeviceCookie, applySessionCookie, readDeviceCookieValue } from '@/utils/session'

type Dependencies = {
	completeGoogleRegistrationUseCase: CompleteGoogleRegistration
}

const bodySchema = z.object({
	birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid birth date'),
	acceptedTerms: z.literal(true),
	acceptedPrivacy: z.literal(true),
})

export default async function completeGoogleRegistrationRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		assertAuthRateLimit(request, 'google-complete-registration')

		const body = await parseJsonBodyUnknown(request)
		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.completeGoogleRegistrationUseCase.run({
			...parsed.data,
			pendingCookie: readGoogleOAuthPendingCookie(request.cookies),
			deviceCookie: readDeviceCookieValue(request.cookies),
		})

		const response = NextResponse.json(
			ApiPresenter.success('Google registration complete', {
				user: result.user,
				returnUrl: result.returnUrl,
			}),
			{ status: 201 }
		)
		applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
		applyDeviceCookie(response.cookies, result.device, request)
		clearGoogleOAuthPendingCookie(response.cookies, request)
		return response
	})
}
