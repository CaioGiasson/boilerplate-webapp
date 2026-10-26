import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import type MarkNotificationRead from '@/useCases/markNotificationRead.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'

type Dependencies = {
	markNotificationReadUseCase: MarkNotificationRead
}

export default async function markNotificationReadRoute(
	request: NextRequest,
	dependencies: Dependencies,
	notificationId: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.markNotificationReadUseCase.run({ userId: session.userId, notificationId })

		return NextResponse.json(ApiPresenter.success('Notification marked as read', result), { status: 200 })
	})
}
