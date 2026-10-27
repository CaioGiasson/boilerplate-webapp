import { NextRequest, NextResponse } from 'next/server'
import listAdminUsersRoute from './routes/listUsers.route'
import createImpersonationTokenRoute from './routes/createImpersonationToken.route'
import listAuditEventsRoute from './routes/listAuditEvents.route'
import type ListAdminUsers from '@/useCases/listAdminUsers.usecase'
import type CreateImpersonationToken from '@/useCases/createImpersonationToken.usecase'
import type ListAuditEvents from '@/useCases/listAuditEvents.usecase'

type Dependencies = {
	listAdminUsersUseCase: ListAdminUsers
	createImpersonationTokenUseCase: CreateImpersonationToken
	listAuditEventsUseCase: ListAuditEvents
}

export default class AdminController {
	static listUsers(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return listAdminUsersRoute(request, dependencies)
	}

	static listAuditEvents(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return listAuditEventsRoute(request, dependencies)
	}

	static createImpersonationToken(
		request: NextRequest,
		dependencies: Dependencies,
		targetUserId: string
	): Promise<NextResponse> {
		return createImpersonationTokenRoute(request, dependencies, targetUserId)
	}
}
