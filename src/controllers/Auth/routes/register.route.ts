import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import RegisterUser from '@/useCases/registerUser.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit, rateLimitKeyPartFromBody } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { applySessionCookie } from '@/utils/session'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { registerSettingsSchema } from '@/schemas/userSetting.schema'
import { locales } from '@/constants/texts'
import { resolveRequestLocale } from '@/utils/requestLocale'
import { withIdempotencyKey } from '@/utils/idempotency'

type Dependencies = {
	registerUserUseCase: RegisterUser
}

const bodySchema = z.object({
	nickname: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
	passwordConfirmation: z.string().min(1).max(PASSWORD_MAX_LENGTH),
	birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid birth date'),
	device: z.string().optional(),
	acceptedTerms: z.literal(true),
	acceptedPrivacy: z.literal(true),
	settings: registerSettingsSchema.optional(),
	locale: z.enum(locales).optional(),
})

export default async function registerRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const body = await parseJsonBodyUnknown(request)
		assertAuthRateLimit(request, rateLimitKeyPartFromBody(body, ['email', 'nickname']))

		const emailKey =
			body && typeof body === 'object' && typeof (body as { email?: unknown }).email === 'string'
				? String((body as { email: string }).email).toLowerCase()
				: 'unknown'

		return withIdempotencyKey(request, `register:${emailKey}`, async () => {
			const parsed = bodySchema.safeParse(body)

			if (!parsed.success) {
				throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
			}

			const locale = resolveRequestLocale(request, parsed.data.locale)
			const result = await dependencies.registerUserUseCase.run({ ...parsed.data, locale })
			const response = NextResponse.json(ApiPresenter.success('User registered', { user: result.user }), {
				status: 201,
			})
			applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
			return response
		})
	})
}
