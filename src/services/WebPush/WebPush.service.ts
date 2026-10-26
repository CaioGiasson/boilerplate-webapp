import webpush from 'web-push'
import { getVapidConfig, type VapidConfig } from '@/config/env'
import LogManager from '@/managers/Log.manager'
import { runWithoutTransaction } from '@/managers/Db.manager'
import PushSubscriptionRepository, { type PushSubscriptionRecord } from '@/repositories/PushSubscription.repository'
import type { WebPushPayload, WebPushPort } from '@/services/WebPush/webPush.port'

/** Limite de payload do Web Push (4 KB). */
export const MAX_PUSH_JSON_BYTES = 4096
const PUSH_TTL_SECONDS = 60 * 60
const EXPIRED_SUBSCRIPTION_STATUS_CODES = new Set([404, 410])

type PushTarget = { endpoint: string; keys: { p256dh: string; auth: string } }
type PushSender = (target: PushTarget, body: string, options: { TTL: number }) => Promise<unknown>

export type WebPushSubscriptionStore = {
	list(userId: string): Promise<PushSubscriptionRecord[]>
	deleteExpired(endpoint: string): Promise<void>
}

function serializePayload(payload: WebPushPayload, text: string): string {
	return JSON.stringify({
		title: payload.title,
		text,
		...(payload.link ? { link: payload.link } : {}),
		...(payload.notificationId ? { notificationId: payload.notificationId } : {}),
	})
}

/** Corta o texto por busca binária até o JSON caber em 4 KB; título e link nunca são cortados. */
export function buildPushBody(payload: WebPushPayload, maxBytes: number = MAX_PUSH_JSON_BYTES): string {
	if (Buffer.byteLength(serializePayload(payload, payload.text), 'utf8') <= maxBytes) {
		return serializePayload(payload, payload.text)
	}

	let low = 0
	let high = payload.text.length
	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2)
		const candidate = serializePayload(payload, `${payload.text.slice(0, mid)}…`)
		if (Buffer.byteLength(candidate, 'utf8') <= maxBytes) {
			low = mid
		} else {
			high = mid - 1
		}
	}

	return serializePayload(payload, `${payload.text.slice(0, low)}…`)
}

function readStatusCode(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') return undefined
	const { statusCode, status } = error as { statusCode?: unknown; status?: unknown }
	if (typeof statusCode === 'number') return statusCode
	return typeof status === 'number' ? status : undefined
}

function createDefaultSender(vapid: VapidConfig): PushSender {
	webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
	return (target, body, options) => webpush.sendNotification(target, body, options)
}

function createDefaultStore(): WebPushSubscriptionStore {
	return {
		list: (userId) => runWithoutTransaction((client) => new PushSubscriptionRepository(client).listByUser(userId)),
		deleteExpired: (endpoint) =>
			runWithoutTransaction((client) => new PushSubscriptionRepository(client).deleteExpiredByEndpoint(endpoint)),
	}
}

export default class WebPushService implements WebPushPort {
	private readonly sender: PushSender | null

	constructor(
		private readonly vapid: VapidConfig | null = getVapidConfig(),
		private readonly store: WebPushSubscriptionStore = createDefaultStore(),
		sender?: PushSender
	) {
		this.sender = sender ?? (vapid ? createDefaultSender(vapid) : null)
	}

	isEnabled(): boolean {
		return this.sender !== null
	}

	getPublicKey(): string | null {
		return this.vapid?.publicKey ?? null
	}

	async sendToUser(userId: string, payload: WebPushPayload): Promise<void> {
		if (!this.sender) return

		const subscriptions = await this.store.list(userId)
		if (subscriptions.length === 0) return

		const body = buildPushBody(payload)
		const sender = this.sender
		await Promise.allSettled(
			subscriptions.map(async (subscription) => {
				try {
					await sender(
						{
							endpoint: subscription.endpoint,
							keys: { p256dh: subscription.p256dh, auth: subscription.auth },
						},
						body,
						{ TTL: PUSH_TTL_SECONDS }
					)
				} catch (error: unknown) {
					const statusCode = readStatusCode(error)
					if (statusCode !== undefined && EXPIRED_SUBSCRIPTION_STATUS_CODES.has(statusCode)) {
						await this.store.deleteExpired(subscription.endpoint)
						return
					}
					// Nunca logar endpoint nem chaves: identificam o aparelho.
					LogManager.warn('Web push delivery failed', { subscriptionId: subscription.id, statusCode })
				}
			})
		)
	}
}

let sharedWebPushService: WebPushService | undefined

export function getWebPushService(): WebPushService {
	if (!sharedWebPushService) {
		sharedWebPushService = new WebPushService()
	}
	return sharedWebPushService
}

export function setWebPushServiceForTests(service: WebPushService | undefined): void {
	sharedWebPushService = service
}
