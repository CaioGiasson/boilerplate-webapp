import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import type UnregisterPushSubscription from '@/useCases/unregisterPushSubscription.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertNotImpersonation, requireAuth } from '@/middleware/auth.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'

type Dependencies = {
	unregisterPushSubscriptionUseCase: UnregisterPushSubscription
}

const bodySchema = z.object({ endpoint: z.string().min(1) })

export default async function unsubscribeRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)

		const parsed = bodySchema.safeParse(await parseJsonBodyUnknown(request))
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.unregisterPushSubscriptionUseCase.run({
			userId: session.userId,
			endpoint: parsed.data.endpoint,
		})

		return NextResponse.json(ApiPresenter.success('Push subscription removed', result), { status: 200 })
	})
}
