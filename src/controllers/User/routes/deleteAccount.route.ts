import { getPrismaClient } from '@/managers/Db.manager'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import DeleteUserAccount from '@/useCases/deleteUserAccount.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { clearSessionCookies } from '@/utils/session'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'
import { resolveRequestLocale } from '@/utils/requestLocale'

type Dependencies = {
	deleteUserAccountUseCase: DeleteUserAccount
}

const bodySchema = z.object({
	currentPassword: z.string().max(PASSWORD_MAX_LENGTH).optional(),
	locale: z.enum(['pt', 'en', 'es']).optional(),
})

export default async function deleteAccountRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		assertAuthRateLimit(request, session.userId)

		const body = await request.json()
		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const locale = resolveRequestLocale(request, parsed.data.locale)
		const result = await dependencies.deleteUserAccountUseCase.run({
			userId: session.userId,
			currentPassword: parsed.data.currentPassword,
			locale,
			session: {
				jti: session.jti,
				device: session.device,
				exp: session.exp,
			},
		})

		const response = NextResponse.json(
			ApiPresenter.success('Account deletion scheduled', {
				ok: true,
				deletedAt: result.deletedAt.toISOString(),
				deadlineAt: result.deadlineAt.toISOString(),
			}),
			{
				status: 200,
			}
		)
		clearSessionCookies(response.cookies, request)
		return response
	})
}
