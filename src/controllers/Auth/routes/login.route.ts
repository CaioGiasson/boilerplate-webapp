import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import LoginUser from '@/useCases/loginUser.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit, rateLimitKeyPartFromBody } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { readDeviceCookieValue } from '@/utils/session'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { respondWithCompletedLogin } from './loginResponse'

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

		if (result.kind === 'two_factor_required') {
			// Sem cookie de sessão: a sessão só nasce depois do segundo fator.
			return NextResponse.json(
				ApiPresenter.success('Two-factor code required', {
					twoFactorRequired: true,
					challengeToken: result.challengeToken,
				}),
				{ status: 200, headers: { 'Cache-Control': 'no-store' } }
			)
		}

		return respondWithCompletedLogin(request, result)
	})
}
