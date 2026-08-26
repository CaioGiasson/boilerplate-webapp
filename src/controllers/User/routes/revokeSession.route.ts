import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import RevokeUserSession from '@/useCases/revokeUserSession.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	revokeUserSessionUseCase: RevokeUserSession
}

export default async function revokeSessionRoute(
	request: NextRequest,
	dependencies: Dependencies,
	sessionId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		await dependencies.revokeUserSessionUseCase.run({
			userId: session.userId,
			sessionId,
			currentJti: session.jti,
		})

		return NextResponse.json(ApiPresenter.success('Session revoked', { ok: true }), { status: 200 })
	})
}
