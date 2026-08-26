import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import ExportUserData from '@/useCases/exportUserData.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	exportUserDataUseCase: ExportUserData
}

export default async function exportUserDataRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.exportUserDataUseCase.run({ userId: session.userId })
		return NextResponse.json(ApiPresenter.success('Export ready', result), { status: 200 })
	})
}
