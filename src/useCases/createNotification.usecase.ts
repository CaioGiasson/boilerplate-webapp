import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import LogManager from '@/managers/Log.manager'
import NotificationRepository, { type NotificationRecord } from '@/repositories/Notification.repository'
import type { WebPushPort } from '@/services/WebPush/webPush.port'
import { isSafeInAppLink } from '@/utils/safeInAppLink'

export const NOTIFICATION_TYPE_MAX_LENGTH = 64
export const NOTIFICATION_TITLE_MAX_LENGTH = 200
export const NOTIFICATION_TEXT_MAX_LENGTH = 4000

type Input = {
	userId: string
	type: string
	title: string
	text: string
	link?: string
	/** Grava só o sino, sem Web Push. */
	skipWebPush?: boolean
}

type Output = {
	notification: NotificationRecord
}

/**
 * Cria a notificação in-app e, se o push estiver configurado, avisa os aparelhos do usuário.
 * É o ponto de entrada para outros use cases notificarem alguém. Chame **depois** do commit do use case de origem:
 * a gravação roda fora de transação e o push é uma chamada externa (ADR-007). Falha de push nunca desfaz o sino.
 */
export default class CreateNotification extends UseCaseMasterPort<Input, Output> {
	private webPush: WebPushPort

	constructor(webPush: WebPushPort) {
		super()
		this.webPush = webPush
	}

	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!input.type?.trim() || input.type.length > NOTIFICATION_TYPE_MAX_LENGTH) {
			throw new ValidationError(`type is required (max ${NOTIFICATION_TYPE_MAX_LENGTH} characters)`)
		}
		if (!input.title?.trim() || input.title.length > NOTIFICATION_TITLE_MAX_LENGTH) {
			throw new ValidationError(`title is required (max ${NOTIFICATION_TITLE_MAX_LENGTH} characters)`)
		}
		if (!input.text?.trim() || input.text.length > NOTIFICATION_TEXT_MAX_LENGTH) {
			throw new ValidationError(`text is required (max ${NOTIFICATION_TEXT_MAX_LENGTH} characters)`)
		}
		if (input.link !== undefined && !isSafeInAppLink(input.link)) {
			throw new ValidationError('link must be an in-app path')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const notification = await new NotificationRepository(injectables.prisma).create({
			userId: input.userId,
			type: input.type.trim(),
			title: input.title.trim(),
			text: input.text.trim(),
			link: input.link,
		})

		if (!input.skipWebPush && this.webPush.isEnabled()) {
			try {
				await this.webPush.sendToUser(notification.userId, {
					title: notification.title,
					text: notification.text,
					link: notification.link ?? undefined,
					notificationId: notification.id,
				})
			} catch (error: unknown) {
				LogManager.warn('Web push after notification create failed', {
					notificationId: notification.id,
					errorName: error instanceof Error ? error.name : undefined,
				})
			}
		}

		return { notification }
	}
}
