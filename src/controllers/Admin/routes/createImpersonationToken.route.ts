import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import CreateImpersonationToken from '@/useCases/createImpersonationToken.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { assertNotImpersonation, requireAuth } from '@/middleware/auth.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'

type Dependencies = {
	createImpersonationTokenUseCase: CreateImpersonationToken
}

export default async function createImpersonationTokenRoute(
	request: NextRequest,
	dependencies: Dependencies,
	targetUserId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)

		const result = await dependencies.createImpersonationTokenUseCase.run({
			callerId: session.userId,
			targetUserId,
		})

		return NextResponse.json(ApiPresenter.success('Impersonation token issued', result), {
			status: 200,
			headers: { 'Cache-Control': 'no-store' },
		})
	})
}
