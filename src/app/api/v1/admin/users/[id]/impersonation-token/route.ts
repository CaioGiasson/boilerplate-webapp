import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import AdminController from '@/controllers/Admin/Admin.controller'

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
	const { id } = await context.params
	return AdminController.createImpersonationToken(request, getDependencies(), id)
}
