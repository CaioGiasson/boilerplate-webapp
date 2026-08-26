import { getPrismaClient } from '@/managers/Db.manager'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import ChangeUserPassword from '@/useCases/changeUserPassword.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { applySessionCookie } from '@/utils/session'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'

type Dependencies = {
	changeUserPasswordUseCase: ChangeUserPassword
}

const bodySchema = z.object({
	currentPassword: z.string().max(PASSWORD_MAX_LENGTH),
	newPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
	newPasswordConfirmation: z.string().min(1).max(PASSWORD_MAX_LENGTH),
})

export default async function changePasswordRoute(
	request: NextRequest,
	dependencies: Dependencies,
	userId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient(), { userIdParam: userId })
		assertAuthRateLimit(request, session.userId)

		const body = await request.json()
		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.changeUserPasswordUseCase.run({
			userId,
			...parsed.data,
		})

		const response = NextResponse.json(ApiPresenter.success('Password updated', { ok: true }), {
			status: 200,
		})
		applySessionCookie(response.cookies, result.token, result.ttlSeconds, request)
		return response
	})
}
