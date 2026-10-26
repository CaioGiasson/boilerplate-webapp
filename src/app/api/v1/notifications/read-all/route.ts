import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import NotificationController from '@/controllers/Notification/Notification.controller'

export async function POST(request: NextRequest) {
	return NotificationController.markAllRead(request, getDependencies())
}
