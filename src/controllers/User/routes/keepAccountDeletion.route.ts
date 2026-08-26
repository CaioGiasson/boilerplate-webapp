import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import KeepAccountDeletion from '@/useCases/keepAccountDeletion.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuthForDeletionDecision } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { clearSessionCookies } from '@/utils/session'

type Dependencies = {
	keepAccountDeletionUseCase: KeepAccountDeletion
}

export default async function keepAccountDeletionRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuthForDeletionDecision(request, getPrismaClient())
		assertAuthRateLimit(request, session.userId)

		await dependencies.keepAccountDeletionUseCase.run({
			userId: session.userId,
			session: {
				jti: session.jti,
				device: session.device,
				exp: session.exp,
			},
		})

		const response = NextResponse.json(ApiPresenter.success('Account deletion kept', { ok: true }), {
			status: 200,
		})
		clearSessionCookies(response.cookies, request)
		return response
	})
}
