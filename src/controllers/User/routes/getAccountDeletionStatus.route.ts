import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import GetAccountDeletionStatus from '@/useCases/getAccountDeletionStatus.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuthForDeletionDecision } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'

type Dependencies = {
	getAccountDeletionStatusUseCase: GetAccountDeletionStatus
}

export default async function getAccountDeletionStatusRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuthForDeletionDecision(request, getPrismaClient())
		assertAuthRateLimit(request, session.userId)

		const result = await dependencies.getAccountDeletionStatusUseCase.run({
			userId: session.userId,
		})

		return NextResponse.json(
			ApiPresenter.success('Account deletion status', {
				deletedAt: result.deletedAt.toISOString(),
				deadlineAt: result.deadlineAt.toISOString(),
			}),
			{ status: 200 }
		)
	})
}
