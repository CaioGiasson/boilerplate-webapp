import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import type RegisterPushSubscription from '@/useCases/registerPushSubscription.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute, parseJsonBodyUnknown } from '@/utils/routeHandler'
import { assertNotImpersonation, requireAuth } from '@/middleware/auth.middleware'
import { assertAuthRateLimit } from '@/middleware/rateLimit.middleware'
import { assertSameOrigin } from '@/utils/csrfOrigin'

type Dependencies = {
	registerPushSubscriptionUseCase: RegisterPushSubscription
}

/** Formato de `PushSubscription.toJSON()` do navegador. */
const bodySchema = z.object({
	endpoint: z.string().min(1),
	keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export default async function subscribeRoute(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		// O aparelho do admin não pode virar destino das notificações do usuário impersonado.
		assertNotImpersonation(session)
		assertAuthRateLimit(request, `push-subscribe:${session.userId}`)

		const parsed = bodySchema.safeParse(await parseJsonBodyUnknown(request))
		if (!parsed.success) {
			throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
		}

		const result = await dependencies.registerPushSubscriptionUseCase.run({
			userId: session.userId,
			endpoint: parsed.data.endpoint,
			p256dh: parsed.data.keys.p256dh,
			auth: parsed.data.keys.auth,
		})

		return NextResponse.json(ApiPresenter.success('Push subscription saved', result), { status: 200 })
	})
}
