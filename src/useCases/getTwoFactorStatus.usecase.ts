import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, ValidationError } from '@/errors'
import TwoFactorRepository from '@/repositories/TwoFactor.repository'
import { isTwoFactorAvailable } from '@/config/env'

type Input = {
	userId: string
}

type Output = {
	/** O servidor tem `TWO_FACTOR_ENCRYPTION_KEY`: sem ela a tela esconde o 2FA. */
	available: boolean
	enabled: boolean
	recoveryCodesRemaining: number
}

export default class GetTwoFactorStatus extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const repository = new TwoFactorRepository(injectables.prisma)
		const state = await repository.findState(input.userId)
		if (!state) throw new NotFoundError('User not found')

		const enabled = state.enabledAt !== null
		return {
			available: isTwoFactorAvailable(),
			enabled,
			recoveryCodesRemaining: enabled ? await repository.countRecoveryCodesRemaining(input.userId) : 0,
		}
	}
}
