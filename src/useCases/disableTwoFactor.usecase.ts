import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, UnauthorizedError, ValidationError } from '@/errors'
import AuditEventRepository from '@/repositories/AuditEvent.repository'
import TwoFactorRepository from '@/repositories/TwoFactor.repository'
import UserRepository from '@/repositories/User.repository'
import { verifyAndConsumeSecondFactor, type SecondFactorInput } from '@/useCases/shared/secondFactor'
import { verifyPasswordOrDummy } from '@/utils/password'
import { PASSWORD_MAX_LENGTH } from '@/utils/passwordPolicy'

type Input = SecondFactorInput & {
	userId: string
	password: string
}

type Output = {
	ok: true
}

/**
 * Desativa o 2FA. Exige a senha **e** um segundo fator (código ou recuperação): quem só roubou a sessão não
 * consegue tirar a proteção da conta.
 */
export default class DisableTwoFactor extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!input.password) throw new ValidationError('Password is required')
		if (input.password.length > PASSWORD_MAX_LENGTH)
			throw new ValidationError('Password must be at most 128 characters')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const user = await new UserRepository(injectables.prisma).findById(input.userId)
		if (!user) throw new NotFoundError('User not found')

		const validPassword = await verifyPasswordOrDummy(user.passwordHash, input.password)
		if (!validPassword) throw new UnauthorizedError('Current password is invalid')

		const repository = new TwoFactorRepository(injectables.prisma)
		const state = await repository.findState(user.id)
		if (!state?.enabledAt) throw new ValidationError('Two-factor is not enabled', 'TWO_FACTOR_NOT_ENABLED')

		await verifyAndConsumeSecondFactor(repository, user.id, state, input)
		await repository.disable(user.id)
		await new AuditEventRepository(injectables.prisma).record({
			action: 'user.two_factor_disabled',
			actorType: 'user',
			actorId: user.id,
			targetUserId: user.id,
		})

		return { ok: true }
	}
}
