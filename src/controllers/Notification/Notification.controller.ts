import { NextRequest, NextResponse } from 'next/server'
import listNotificationsRoute from './routes/list.route'
import markNotificationReadRoute from './routes/markRead.route'
import markAllNotificationsReadRoute from './routes/markAllRead.route'
import type ListNotifications from '@/useCases/listNotifications.usecase'
import type MarkNotificationRead from '@/useCases/markNotificationRead.usecase'
import type MarkAllNotificationsRead from '@/useCases/markAllNotificationsRead.usecase'

type Dependencies = {
	listNotificationsUseCase: ListNotifications
	markNotificationReadUseCase: MarkNotificationRead
	markAllNotificationsReadUseCase: MarkAllNotificationsRead
}

export default class NotificationController {
	static list(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return listNotificationsRoute(request, dependencies)
	}

	static markRead(request: NextRequest, dependencies: Dependencies, notificationId: string): Promise<NextResponse> {
		return markNotificationReadRoute(request, dependencies, notificationId)
	}

	static markAllRead(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return markAllNotificationsReadRoute(request, dependencies)
	}
}
