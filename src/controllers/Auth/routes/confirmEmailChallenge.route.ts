import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import ConfirmEmailChallenge from '@/useCases/confirmEmailChallenge.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit, rateLimitKeyPartFromBody } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { resolveRequestLocale } from '@/utils/requestLocale'
import { locales } from '@/constants/texts'

type Dependencies = {
	confirmEmailChallengeUseCase: ConfirmEmailChallenge
}

const bodySchema = z.object({
	token: z
		.string()
		.min(1)
		.transform((value) =>
			value
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, '')
		)
		.refine((value) => value.length === 8, 'A valid 8-character code is required'),
	locale: z.enum(locales).optional(),
})

export default async function confirmEmailChallengeRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const body = await parseJsonBodyUnknown(request)
		assertAuthRateLimit(request, rateLimitKeyPartFromBody(body, ['token']))

		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const locale = resolveRequestLocale(request, parsed.data.locale)
		const result = await dependencies.confirmEmailChallengeUseCase.run({
			token: parsed.data.token,
			locale,
		})

		return NextResponse.json(ApiPresenter.success('Email challenge confirmed', { user: result.user }), {
			status: 200,
		})
	})
}
