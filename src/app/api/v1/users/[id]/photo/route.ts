import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import UserController from '@/controllers/User/User.controller'

// Next.js 15 App Router documents `export const maxDuration`, not a request body size cap.
// Image routes enforce Content-Length (~4MB) and decoded size in the controller.

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const { id } = await context.params
	const dependencies = getDependencies()
	return UserController.uploadPhoto(request, dependencies, id)
}
