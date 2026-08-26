import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import UserRepository from '@/repositories/User.repository'
import { NotFoundError, UnauthorizedError, ValidationError } from '@/errors'
import { accountDeletionDeadline, isWithinAccountDeletionQuarantine } from '@/constants/accountDeletion'

type Input = {
	userId: string
}

type Output = {
	deletedAt: Date
	deadlineAt: Date
}

/** Status da quarentena para a tela de decisão (sessão de deletion decision). */
export default class GetAccountDeletionStatus extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const userRepository = new UserRepository(injectables.prisma)
		const user = await userRepository.findByIdIncludingDeleted(input.userId)

		if (!user?.deletedAt) {
			throw new NotFoundError('User not found')
		}

		if (!isWithinAccountDeletionQuarantine(user.deletedAt)) {
			throw new UnauthorizedError('Account deletion quarantine has expired', 'ACCOUNT_DELETION_EXPIRED')
		}

		return {
			deletedAt: user.deletedAt,
			deadlineAt: accountDeletionDeadline(user.deletedAt),
		}
	}
}
