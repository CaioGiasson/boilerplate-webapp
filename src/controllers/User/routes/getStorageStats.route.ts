import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import type GetUserStorageStats from '@/useCases/getUserStorageStats.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	getUserStorageStatsUseCase: GetUserStorageStats
}

export default async function getStorageStatsRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.getUserStorageStatsUseCase.run({
			userId: session.userId,
		})

		return NextResponse.json(
			ApiPresenter.success('Storage stats retrieved', {
				fileCount: result.fileCount,
				usedBytes: result.usedBytes,
			}),
			{ status: 200 }
		)
	})
}
