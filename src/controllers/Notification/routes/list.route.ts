import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import type ListNotifications from '@/useCases/listNotifications.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	listNotificationsUseCase: ListNotifications
}

export default async function listNotificationsRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())

		const params = request.nextUrl.searchParams
		const rawLimit = params.get('limit')
		const limit = rawLimit === null ? undefined : Number(rawLimit)
		if (limit !== undefined && !Number.isInteger(limit)) {
			throw new ValidationError('limit must be an integer')
		}

		const result = await dependencies.listNotificationsUseCase.run({
			userId: session.userId,
			before: params.get('before') ?? undefined,
			limit,
		})

		return NextResponse.json(ApiPresenter.success('Notifications listed', result), {
			status: 200,
			headers: { 'Cache-Control': 'no-store' },
		})
	})
}
