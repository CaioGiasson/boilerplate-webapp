import { getPrismaClient } from '@/managers/Db.manager'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import RequestEmailChange from '@/useCases/requestEmailChange.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { resolveRequestLocale } from '@/utils/requestLocale'
import { locales } from '@/constants/texts'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'

type Dependencies = {
	requestEmailChangeUseCase: RequestEmailChange
}

const bodySchema = z.object({
	password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
	newEmail: z.string().email(),
	locale: z.enum(locales).optional(),
})

export default async function requestEmailChangeRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertAuthRateLimit(request, session.userId)

		const body = await parseJsonBodyUnknown(request)
		const parsed = bodySchema.safeParse(body)
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const locale = resolveRequestLocale(request, parsed.data.locale)
		const result = await dependencies.requestEmailChangeUseCase.run({
			userId: session.userId,
			password: parsed.data.password,
			newEmail: parsed.data.newEmail,
			locale,
		})

		return NextResponse.json(
			ApiPresenter.success('Email change started', {
				user: result.user,
				willUnlinkGoogle: result.willUnlinkGoogle,
			}),
			{ status: 200 }
		)
	})
}
