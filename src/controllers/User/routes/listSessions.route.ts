import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import ListUserSessions from '@/useCases/listUserSessions.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	listUserSessionsUseCase: ListUserSessions
}

export default async function listSessionsRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.listUserSessionsUseCase.run({
			userId: session.userId,
			currentJti: session.jti,
		})

		return NextResponse.json(
			ApiPresenter.success('Sessions listed', {
				sessions: result.sessions.map((item) => ({
					id: item.id,
					device: item.device,
					createdAt: item.createdAt.toISOString(),
					exp: item.exp.toISOString(),
					current: item.current,
				})),
			}),
			{ status: 200 }
		)
	})
}
