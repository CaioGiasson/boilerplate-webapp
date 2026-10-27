import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import ListAuditEvents from '@/useCases/listAuditEvents.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
import { parsePageQuery } from '@/utils/pagination'
import { isAuditAction } from '@/constants/audit'
import { assertNotImpersonation, requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	listAuditEventsUseCase: ListAuditEvents
}

export default async function listAuditEventsRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)

		const params = request.nextUrl.searchParams
		const { cursor, limit, order } = parsePageQuery(params)
		const rawAction = params.get('action')
		if (rawAction !== null && !isAuditAction(rawAction)) throw new ValidationError('action is invalid')

		const result = await dependencies.listAuditEventsUseCase.run({
			callerId: session.userId,
			cursor,
			limit,
			order,
			action: rawAction ?? undefined,
		})

		return NextResponse.json(ApiPresenter.success('Audit events listed', result), {
			status: 200,
			headers: { 'Cache-Control': 'no-store' },
		})
	})
}
