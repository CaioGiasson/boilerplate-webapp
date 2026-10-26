import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ConflictError, ServiceUnavailableError, ValidationError } from '@/errors'
import PushSubscriptionRepository, { MAX_PUSH_SUBSCRIPTIONS_PER_USER } from '@/repositories/PushSubscription.repository'
import type { WebPushPort } from '@/services/WebPush/webPush.port'
import { getPushAllowedHostSuffixes } from '@/config/env'
import { isBlockedHostname, isBlockedIp } from '@/utils/safeImageUrl'

export const PUSH_ENDPOINT_MAX_LENGTH = 2048
export const PUSH_KEY_MAX_LENGTH = 512

type Input = {
	userId: string
	endpoint: string
	p256dh: string
	auth: string
}

type Output = {
	ok: true
}

function isAllowedPushHost(hostname: string, suffixes: readonly string[]): boolean {
	const host = hostname.toLowerCase().replace(/\.$/, '')
	return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
}

/**
 * Só aceita endpoint HTTPS, sem credencial nem porta explícita, de um serviço de push conhecido
 * (`getPushAllowedHostSuffixes`) e que não seja nome/IP interno. O servidor envia o push por POST a esse endereço:
 * aceitar host arbitrário seria SSRF (IP literal, `localhost`, serviço interno).
 */
export function isAcceptablePushEndpoint(
	endpoint: string,
	allowedSuffixes: readonly string[] = getPushAllowedHostSuffixes()
): boolean {
	if (endpoint.length > PUSH_ENDPOINT_MAX_LENGTH) return false
	try {
		const url = new URL(endpoint)
		return (
			url.protocol === 'https:' &&
			!url.username &&
			!url.password &&
			url.port === '' &&
			!isBlockedHostname(url.hostname) &&
			!isBlockedIp(url.hostname) &&
			isAllowedPushHost(url.hostname, allowedSuffixes)
		)
	} catch {
		return false
	}
}

export default class RegisterPushSubscription extends UseCaseMasterPort<Input, Output> {
	private webPush: WebPushPort

	constructor(webPush: WebPushPort) {
		super()
		this.webPush = webPush
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!isAcceptablePushEndpoint(input.endpoint ?? '')) throw new ValidationError('Invalid push endpoint')
		for (const key of [input.p256dh, input.auth]) {
			if (!key?.trim() || key.length > PUSH_KEY_MAX_LENGTH)
				throw new ValidationError('Invalid push subscription keys')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		if (!this.webPush.isEnabled()) {
			throw new ServiceUnavailableError('Push notifications are not configured')
		}

		const repository = new PushSubscriptionRepository(injectables.prisma)
		const existing = await repository.listByUser(input.userId)
		const alreadyRegistered = existing.some((item) => item.endpoint === input.endpoint)
		if (!alreadyRegistered && existing.length >= MAX_PUSH_SUBSCRIPTIONS_PER_USER) {
			throw new ConflictError('Too many push subscriptions')
		}

		await repository.upsertByEndpoint({
			userId: input.userId,
			endpoint: input.endpoint,
			p256dh: input.p256dh,
			auth: input.auth,
		})

		return { ok: true }
	}
}
