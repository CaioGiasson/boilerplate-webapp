import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import ForgotPassword from '@/useCases/forgotPassword.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit, rateLimitKeyPartFromBody } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { resolveRequestLocale } from '@/utils/requestLocale'
import { locales } from '@/constants/texts'

type Dependencies = {
	forgotPasswordUseCase: ForgotPassword
}

const bodySchema = z.object({
	email: z.string().email(),
	locale: z.enum(locales).optional(),
})

export default async function forgotPasswordRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const body = await parseJsonBodyUnknown(request)
		assertAuthRateLimit(request, rateLimitKeyPartFromBody(body, ['email']))

		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const locale = resolveRequestLocale(request, parsed.data.locale)
		await dependencies.forgotPasswordUseCase.run({
			email: parsed.data.email,
			locale,
		})

		return NextResponse.json(
			ApiPresenter.success(
				'If an account with that email exists and is verified, a reset code has been sent',
				null
			),
			{ status: 200 }
		)
	})
}
