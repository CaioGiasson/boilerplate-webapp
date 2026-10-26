import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import NotificationRepository from '@/repositories/Notification.repository'

type Input = {
	userId: string
}

type Output = {
	updatedCount: number
}

export default class MarkAllNotificationsRead extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const updatedCount = await new NotificationRepository(injectables.prisma).markAllRead({
			userId: input.userId,
			at: new Date(),
		})

		return { updatedCount }
	}
}
