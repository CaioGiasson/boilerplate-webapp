import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import ListAdminUsers from '@/useCases/listAdminUsers.usecase'
import ApiPresenter from '@/utils/Api.presenter'
import { ValidationError } from '@/errors'
import { handleRoute } from '@/utils/routeHandler'
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

		const rawPage = request.nextUrl.searchParams.get('page')
		const page = rawPage === null ? undefined : Number(rawPage)
		if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
			throw new ValidationError('page must be a positive integer')
		}

		const result = await dependencies.listAdminUsersUseCase.run({ callerId: session.userId, page })

		return NextResponse.json(ApiPresenter.success('Users listed', result), { status: 200 })
	})
}
