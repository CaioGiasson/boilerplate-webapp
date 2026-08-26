import { SessionEventType } from '@prisma/client'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import SessionEventRepository from '@/repositories/SessionEvent.repository'
import UserRepository from '@/repositories/User.repository'
import { NotFoundError, ValidationError } from '@/errors'

type Input = {
	userId: string
	session?: {
		jti: string
		device: string
		exp?: number
	}
}

type Output = {
	ok: true
}

/** MANTER exclusão do perfil — permanece em quarentena e encerra a sessão de decisão. */
export default class KeepAccountDeletion extends UseCaseMasterPort<Input, Output> {
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

		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		await activeSessionRepository.deleteAllForUser(user.id)

		if (input.session) {
			const sessionEventRepository = new SessionEventRepository(injectables.prisma)
			const alreadyRevoked = await sessionEventRepository.existsForJti(input.session.jti)
			if (!alreadyRevoked) {
				await sessionEventRepository.create({
					jti: input.session.jti,
					event: SessionEventType.LOGOUT,
					device: input.session.device,
					exp: input.session.exp,
				})
			}
		}

		return { ok: true }
	}
}
