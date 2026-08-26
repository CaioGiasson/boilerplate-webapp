import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import RevokeOtherUserSessions from '@/useCases/revokeOtherUserSessions.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	revokeOtherUserSessionsUseCase: RevokeOtherUserSessions
}

export default async function revokeOtherSessionsRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.revokeOtherUserSessionsUseCase.run({
			userId: session.userId,
			currentJti: session.jti,
		})

		return NextResponse.json(
			ApiPresenter.success('Other sessions revoked', { ok: true, revokedCount: result.revokedCount }),
			{ status: 200 }
		)
	})
}
