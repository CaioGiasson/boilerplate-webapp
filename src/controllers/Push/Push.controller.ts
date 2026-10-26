import { NextRequest, NextResponse } from 'next/server'
import vapidPublicKeyRoute from './routes/vapidPublicKey.route'
import subscribeRoute from './routes/subscribe.route'
import unsubscribeRoute from './routes/unsubscribe.route'
import sendTestRoute from './routes/sendTest.route'
import type RegisterPushSubscription from '@/useCases/registerPushSubscription.usecase'
import type UnregisterPushSubscription from '@/useCases/unregisterPushSubscription.usecase'
import type SendTestPushNotification from '@/useCases/sendTestPushNotification.usecase'
import type { WebPushPort } from '@/services/WebPush/webPush.port'

type Dependencies = {
	webPushService: WebPushPort
	registerPushSubscriptionUseCase: RegisterPushSubscription
	unregisterPushSubscriptionUseCase: UnregisterPushSubscription
	sendTestPushNotificationUseCase: SendTestPushNotification
}

export default class PushController {
	static vapidPublicKey(dependencies: Dependencies): Promise<NextResponse> {
		return vapidPublicKeyRoute(dependencies)
	}

	static subscribe(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return subscribeRoute(request, dependencies)
	}

	static unsubscribe(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return unsubscribeRoute(request, dependencies)
	}

	static sendTest(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return sendTestRoute(request, dependencies)
	}
}
