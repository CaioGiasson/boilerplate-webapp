import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import ListAdminUsers from '@/useCases/listAdminUsers.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { parsePageQuery } from '@/utils/pagination'
import { assertNotImpersonation, requireAuth } from '@/middleware/auth.middleware'

type Dependencies = {
	listAdminUsersUseCase: ListAdminUsers
}

export default async function listAdminUsersRoute(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		assertNotImpersonation(session)

		const { cursor, limit, q, order } = parsePageQuery(request.nextUrl.searchParams)
		const result = await dependencies.listAdminUsersUseCase.run({
			callerId: session.userId,
			cursor,
			limit,
			q,
			order,
		})

		return NextResponse.json(ApiPresenter.success('Users listed', result), {
			status: 200,
			headers: { 'Cache-Control': 'no-store' },
		})
	})
}
