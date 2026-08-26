import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

type RouteContext = {
	params: Promise<{ nickname: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
	const { nickname } = await context.params
	const dependencies = getDependencies()
	return UserController.checkNickname(request, dependencies, decodeURIComponent(nickname))
}
