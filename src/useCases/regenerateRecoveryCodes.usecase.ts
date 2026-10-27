import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, ValidationError } from '@/errors'
import AuditEventRepository from '@/repositories/AuditEvent.repository'
import TwoFactorRepository from '@/repositories/TwoFactor.repository'
import { verifyAndConsumeSecondFactor } from '@/useCases/shared/secondFactor'
import { generateRecoveryCodes, hashRecoveryCode } from '@/utils/totp'

type Input = {
	userId: string
	/** Só o código do app: um código de recuperação não pode gerar outros. */
	code: string
}

type Output = {
	/** Mostrados **uma única vez**; os anteriores deixam de valer. */
	recoveryCodes: string[]
}

export default class RegenerateRecoveryCodes extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!input.code?.trim()) throw new ValidationError('Code is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const repository = new TwoFactorRepository(injectables.prisma)
		const state = await repository.findState(input.userId)
		if (!state) throw new NotFoundError('User not found')
		if (!state.enabledAt) throw new ValidationError('Two-factor is not enabled', 'TWO_FACTOR_NOT_ENABLED')

		await verifyAndConsumeSecondFactor(repository, input.userId, state, { code: input.code })

		const recoveryCodes = generateRecoveryCodes()
		await repository.replaceRecoveryCodes(input.userId, recoveryCodes.map(hashRecoveryCode))
		await new AuditEventRepository(injectables.prisma).record({
			action: 'user.two_factor_recovery_regenerated',
			actorType: 'user',
			actorId: input.userId,
			targetUserId: input.userId,
		})

		return { recoveryCodes }
	}
}
