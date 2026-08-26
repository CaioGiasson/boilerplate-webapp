import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import GetUserProfile from '@/useCases/getUserProfile.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	getUserProfileUseCase: GetUserProfile
}

export default async function getProfileRoute(
	request: NextRequest,
	dependencies: Dependencies,
	userId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		await requireAuth(request, getPrismaClient(), { userIdParam: userId })
		const result = await dependencies.getUserProfileUseCase.run({ userId })
		return NextResponse.json(ApiPresenter.success('User found', { user: result.user }), {
			status: 200,
		})
	})
}
