import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import type MarkAllNotificationsRead from '@/useCases/markAllNotificationsRead.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'

type Dependencies = {
	markAllNotificationsReadUseCase: MarkAllNotificationsRead
}

export default async function markAllNotificationsReadRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.markAllNotificationsReadUseCase.run({ userId: session.userId })

		return NextResponse.json(ApiPresenter.success('Notifications marked as read', result), { status: 200 })
	})
}
