import { getPrismaClient } from '@/managers/Db.manager'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import SendEmailVerification from '@/useCases/sendEmailVerification.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { resolveRequestLocale } from '@/utils/requestLocale'
import { locales } from '@/constants/texts'

type Dependencies = {
	sendEmailVerificationUseCase: SendEmailVerification
}

const bodySchema = z.object({
	locale: z.enum(locales).optional(),
})

export default async function sendEmailVerificationRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertAuthRateLimit(request, session.userId)

		const body = await parseJsonBodyUnknown(request)
		const parsed = bodySchema.safeParse(body ?? {})
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const locale = resolveRequestLocale(request, parsed.data.locale)
		const result = await dependencies.sendEmailVerificationUseCase.run({
			userId: session.userId,
			locale,
		})

		return NextResponse.json(
			ApiPresenter.success(result.sent ? 'Verification email sent' : 'Email already verified', {
				user: result.user,
				sent: result.sent,
			}),
			{ status: 200 }
		)
	})
}
