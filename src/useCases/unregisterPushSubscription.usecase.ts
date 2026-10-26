import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import PushSubscriptionRepository from '@/repositories/PushSubscription.repository'

type Input = {
	userId: string
	endpoint: string
}

type Output = {
	removed: boolean
}

/** Idempotente: cancelar uma assinatura que não existe (ou é de outra conta) responde 200 com `removed: false`. */
export default class UnregisterPushSubscription extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!input.endpoint?.trim()) throw new ValidationError('Endpoint is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const count = await new PushSubscriptionRepository(injectables.prisma).deleteByEndpoint({
			userId: input.userId,
			endpoint: input.endpoint,
		})

		return { removed: count > 0 }
	}
}
