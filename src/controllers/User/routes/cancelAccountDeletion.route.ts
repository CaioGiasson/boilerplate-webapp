import { getPrismaClient } from '@/managers/Db.manager'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import CancelAccountDeletion from '@/useCases/cancelAccountDeletion.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { requireAuthForDeletionDecision } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { resolveRequestLocale } from '@/utils/requestLocale'

type Dependencies = {
	cancelAccountDeletionUseCase: CancelAccountDeletion
}

const bodySchema = z.object({
	locale: z.enum(['pt', 'en', 'es']).optional(),
})

export default async function cancelAccountDeletionRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuthForDeletionDecision(request, getPrismaClient())
		assertAuthRateLimit(request, session.userId)

		const body = await parseJsonBodyUnknown(request)
		const parsed = bodySchema.safeParse(body ?? {})
		const bodyLocale = parsed.success ? parsed.data.locale : undefined
		const locale = resolveRequestLocale(request, bodyLocale)

		const result = await dependencies.cancelAccountDeletionUseCase.run({
			userId: session.userId,
			locale,
		})

		return NextResponse.json(
			ApiPresenter.success('Account deletion cancelled', {
				user: result.user,
				settings: result.settings,
			}),
			{ status: 200 }
		)
	})
}
