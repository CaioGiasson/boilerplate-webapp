import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import type SendTestPushNotification from '@/useCases/sendTestPushNotification.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { assertNotImpersonation, requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { resolveRequestLocale } from '@/utils/requestLocale'

type Dependencies = {
	sendTestPushNotificationUseCase: SendTestPushNotification
}

export default async function sendTestRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)
		assertAuthRateLimit(request, `push-test:${session.userId}`)

		const result = await dependencies.sendTestPushNotificationUseCase.run({
			userId: session.userId,
			locale: resolveRequestLocale(request),
		})

		return NextResponse.json(ApiPresenter.success('Test notification sent', result), { status: 200 })
	})
}
