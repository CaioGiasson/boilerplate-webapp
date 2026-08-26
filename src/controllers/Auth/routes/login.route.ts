import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import LoginUser from '@/useCases/loginUser.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit, rateLimitKeyPartFromBody } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { applyDeviceCookie, applySessionCookie, readDeviceCookieValue } from '@/utils/session'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'

type Dependencies = {
	loginUserUseCase: LoginUser
}

const bodySchema = z.object({
	identifier: z.string().min(1),
	password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
})

export default async function loginRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const body = await parseJsonBodyUnknown(request)
		assertAuthRateLimit(request, rateLimitKeyPartFromBody(body, ['identifier']))

		const parsed = bodySchema.safeParse(body)

		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.loginUserUseCase.run({
			...parsed.data,
			deviceCookie: readDeviceCookieValue(request.cookies),
		})

		if (result.kind === 'deletion_decision') {
			const response = NextResponse.json(
				ApiPresenter.success('Account deletion decision required', {
					deletionDecisionRequired: true,
					deletedAt: result.deletedAt.toISOString(),
					deadlineAt: result.deadlineAt.toISOString(),
				}),
				{ status: 200 }
			)
			applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
			applyDeviceCookie(response.cookies, result.device, request)
			return response
		}

		const response = NextResponse.json(
			ApiPresenter.success('Login successful', {
				user: result.user,
				settings: result.settings,
			}),
			{ status: 200 }
		)
		applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
		applyDeviceCookie(response.cookies, result.device, request)
		return response
	})
}
