import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

type RouteContext = {
	params: Promise<{ sessionId: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const { sessionId } = await context.params
	return UserController.revokeSession(request, getDependencies(), sessionId)
}
