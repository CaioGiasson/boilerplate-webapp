import { NextResponse } from 'next/server'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import type { WebPushPort } from '@/services/WebPush/webPush.port'

type Dependencies = {
	webPushService: WebPushPort
}

/** Público: a chave VAPID pública não é segredo. `enabled: false` quando o push não está configurado. */
export default async function vapidPublicKeyRoute(dependencies: Dependencies): Promise<NextResponse> {
	return handleRoute(async () => {
		const publicKey = dependencies.webPushService.getPublicKey()

		return NextResponse.json(
			ApiPresenter.success('Push configuration', { enabled: publicKey !== null, publicKey }),
			{
				status: 200,
				headers: { 'Cache-Control': 'no-store' },
			}
		)
	})
}
