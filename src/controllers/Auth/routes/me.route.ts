import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import GetUserProfile from '@/useCases/getUserProfile.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { UnauthorizedError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth, readSessionTokenFromRequest } from '@/middleware/auth.middleware'

type Dependencies = {
	getUserProfileUseCase: GetUserProfile
}

export default async function meRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		if (!readSessionTokenFromRequest(request)) {
			throw new UnauthorizedError('Authentication required')
		}

		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.getUserProfileUseCase.run({ userId: session.userId })

		return NextResponse.json(ApiPresenter.success('Session active', { user: result.user }), {
			status: 200,
		})
	})
}
