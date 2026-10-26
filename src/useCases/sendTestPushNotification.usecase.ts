import UseCaseMasterPort from '@/masterPorts/UseCase.masterport'
import { ServiceUnavailableError, ValidationError } from '@/errors'
import { messagesByLocale, type AppLocale } from '@/constants/texts'
import type CreateNotification from '@/useCases/createNotification.usecase'
import type { WebPushPort } from '@/services/WebPush/webPush.port'

export const TEST_NOTIFICATION_TYPE = 'TEST'
const NOTIFICATIONS_PATH = '/notifications'

type Input = {
	userId: string
	locale: AppLocale
}

type Output = {
	ok: true
}

/** Envia uma notificação de teste **para a própria conta** (sino + push) para validar o aparelho. */
export default class SendTestPushNotification extends UseCaseMasterPort<Input, Output> {
	private createNotification: CreateNotification
	private webPush: WebPushPort

	constructor(createNotification: CreateNotification, webPush: WebPushPort) {
		super()
		this.createNotification = createNotification
		this.webPush = webPush
	}

	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
	}

	async execute(input: Input): Promise<Output> {
		if (!this.webPush.isEnabled()) {
			throw new ServiceUnavailableError('Push notifications are not configured')
		}

		const texts = messagesByLocale[input.locale].notifications
		await this.createNotification.run({
			userId: input.userId,
			type: TEST_NOTIFICATION_TYPE,
			title: texts.testTitle,
			text: texts.testText,
			link: NOTIFICATIONS_PATH,
		})

		return { ok: true }
	}
}
