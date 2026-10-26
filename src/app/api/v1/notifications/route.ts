import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import NotificationController from '@/controllers/Notification/Notification.controller'

export async function GET(request: NextRequest) {
	return NotificationController.list(request, getDependencies())
}
