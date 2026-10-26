import { fetchApi, parseApiResponse } from '@/lib/api-error'

export type PushConfig = { enabled: boolean; publicKey: string | null }

export type PushSupport = 'supported' | 'unsupported'

/** Web Push exige service worker, `PushManager` e `Notification`. */
export function getPushSupport(win: Window = window): PushSupport {
	return 'serviceWorker' in win.navigator && 'PushManager' in win && 'Notification' in win
		? 'supported'
		: 'unsupported'
}

/** A chave VAPID pública vem em base64url; o `subscribe` do navegador pede bytes. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
	const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
	const raw = atob((base64Url + padding).replace(/-/g, '+').replace(/_/g, '/'))
	const bytes = new Uint8Array(new ArrayBuffer(raw.length))
	for (let index = 0; index < raw.length; index += 1) {
		bytes[index] = raw.charCodeAt(index)
	}
	return bytes
}

export async function fetchPushConfig(): Promise<PushConfig> {
	const response = await fetchApi('/api/v1/push/vapid-public-key', { credentials: 'include' })
	return parseApiResponse<PushConfig>(response)
}

async function currentSubscription(): Promise<PushSubscription | null> {
	const registration = await navigator.serviceWorker.ready
	return registration.pushManager.getSubscription()
}

/** `true` quando este navegador já tem uma assinatura ativa. */
export async function isPushSubscribed(): Promise<boolean> {
	if (getPushSupport() === 'unsupported') return false
	return (await currentSubscription()) !== null
}

export type EnablePushResult = 'enabled' | 'denied' | 'unsupported' | 'not-configured'

/** Pede permissão, assina no navegador e registra a assinatura no servidor. */
export async function enablePush(): Promise<EnablePushResult> {
	if (getPushSupport() === 'unsupported') return 'unsupported'

	const config = await fetchPushConfig()
	if (!config.enabled || !config.publicKey) return 'not-configured'

	const permission = await Notification.requestPermission()
	if (permission !== 'granted') return 'denied'

	const registration = await navigator.serviceWorker.ready
	const subscription =
		(await registration.pushManager.getSubscription()) ??
		(await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(config.publicKey),
		}))

	const response = await fetchApi('/api/v1/push/subscriptions', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(subscription.toJSON()),
	})
	await parseApiResponse(response)
	return 'enabled'
}

/** Cancela no navegador e no servidor. Sem assinatura local, não faz nada. */
export async function disablePush(): Promise<void> {
	if (getPushSupport() === 'unsupported') return

	const subscription = await currentSubscription()
	if (!subscription) return

	const { endpoint } = subscription
	await subscription.unsubscribe()
	const response = await fetchApi('/api/v1/push/subscriptions', {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint }),
	})
	await parseApiResponse(response)
}

export async function sendTestPushRequest(): Promise<void> {
	const response = await fetchApi('/api/v1/push/test', { method: 'POST', credentials: 'include' })
	await parseApiResponse(response)
}
