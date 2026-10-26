import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import NotificationController from '@/controllers/Notification/Notification.controller'

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
	const { id } = await context.params
	return NotificationController.markRead(request, getDependencies(), id)
}
