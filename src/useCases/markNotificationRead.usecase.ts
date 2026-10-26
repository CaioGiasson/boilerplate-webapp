import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, ValidationError } from '@/errors'
import NotificationRepository from '@/repositories/Notification.repository'

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

type Input = {
	userId: string
	notificationId: string
}

type Output = {
	ok: true
}

export default class MarkNotificationRead extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!OBJECT_ID_PATTERN.test(input.notificationId ?? '')) throw new NotFoundError('Notification not found')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const found = await new NotificationRepository(injectables.prisma).markRead({
			id: input.notificationId,
			userId: input.userId,
			at: new Date(),
		})
		// Outro dono responde igual a inexistente: não confirma que o id existe.
		if (!found) throw new NotFoundError('Notification not found')

		return { ok: true }
	}
}
