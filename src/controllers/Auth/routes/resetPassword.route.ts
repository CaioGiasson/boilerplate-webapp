import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import ResetPassword from '@/useCases/resetPassword.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertAuthRateLimit, rateLimitKeyPartFromBody } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { EMAIL_CODE_LENGTH } from '@/utils/emailCode'
import { withIdempotencyKey } from '@/utils/idempotency'

type Dependencies = {
	resetPasswordUseCase: ResetPassword
}

const codeSchema = z
	.string()
	.min(1)
	.transform((value) =>
		value
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
	)
	.refine((value) => value.length === EMAIL_CODE_LENGTH, `A valid ${EMAIL_CODE_LENGTH}-character code is required`)

const bodySchema = z
	.object({
		token: codeSchema.optional(),
		code: codeSchema.optional(),
		newPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
		newPasswordConfirmation: z.string().min(1).max(PASSWORD_MAX_LENGTH),
	})
	.refine((data) => Boolean(data.token || data.code), {
		message: `A valid ${EMAIL_CODE_LENGTH}-character code is required`,
		path: ['token'],
	})

export default async function resetPasswordRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const body = await parseJsonBodyUnknown(request)
		assertAuthRateLimit(request, rateLimitKeyPartFromBody(body, ['token', 'code']))

		const codeKey =
			body && typeof body === 'object'
				? String(
						(body as { token?: string; code?: string }).token ??
							(body as { token?: string; code?: string }).code ??
							'unknown'
					)
				: 'unknown'

		return withIdempotencyKey(request, `reset-password:${codeKey}`, async () => {
			const parsed = bodySchema.safeParse(body)
			if (!parsed.success) {
				throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
			}

			await dependencies.resetPasswordUseCase.run({
				token: parsed.data.token ?? parsed.data.code ?? '',
				newPassword: parsed.data.newPassword,
				newPasswordConfirmation: parsed.data.newPasswordConfirmation,
			})

			return NextResponse.json(ApiPresenter.success('Password updated', { ok: true }), { status: 200 })
		})
	})
}
