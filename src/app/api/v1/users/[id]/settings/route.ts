import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const { id } = await context.params
	const dependencies = getDependencies()
	return UserController.setSetting(request, dependencies, id)
}
