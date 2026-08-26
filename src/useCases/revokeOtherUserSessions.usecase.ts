import { SessionEventType } from '@prisma/client'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import SessionEventRepository from '@/repositories/SessionEvent.repository'
import { ValidationError } from '@/errors'
import { hashSessionJti } from '@/utils/session'

type Input = {
	userId: string
	currentJti: string
}

type Output = {
	ok: true
	revokedCount: number
}

export default class RevokeOtherUserSessions extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (!input.currentJti?.trim()) {
			throw new ValidationError('Current session jti is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		const sessionEventRepository = new SessionEventRepository(injectables.prisma)
		const sessions = await activeSessionRepository.listByUserId(input.userId)
		const currentHash = hashSessionJti(input.currentJti)
		const others = sessions.filter((session) => session.jtiHash !== currentHash)

		for (const session of others) {
			await sessionEventRepository.createFromJtiHash({
				jtiHash: session.jtiHash,
				event: SessionEventType.REVOKE,
				device: session.device,
				exp: Math.floor(session.exp.getTime() / 1000),
			})
		}

		await activeSessionRepository.deleteAllForUserExceptJti(input.userId, input.currentJti)

		return { ok: true, revokedCount: others.length }
	}
}
