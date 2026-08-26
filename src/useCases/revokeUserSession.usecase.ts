import { SessionEventType } from '@prisma/client'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import SessionEventRepository from '@/repositories/SessionEvent.repository'
import { ForbiddenError, NotFoundError, ValidationError } from '@/errors'
import { hashSessionJti } from '@/utils/session'

type Input = {
	userId: string
	sessionId: string
	currentJti: string
}

type Output = {
	ok: true
}

export default class RevokeUserSession extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) {
			throw new ValidationError('User id is required')
		}
		if (!input.sessionId?.trim()) {
			throw new ValidationError('Session id is required')
		}
		if (!input.currentJti?.trim()) {
			throw new ValidationError('Current session jti is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		const sessionEventRepository = new SessionEventRepository(injectables.prisma)
		const session = await activeSessionRepository.findByIdForUser(input.sessionId, input.userId)

		if (!session) {
			throw new NotFoundError('Session not found')
		}

		if (session.jtiHash === hashSessionJti(input.currentJti)) {
			throw new ForbiddenError('Cannot revoke the current session')
		}

		await sessionEventRepository.createFromJtiHash({
			jtiHash: session.jtiHash,
			event: SessionEventType.REVOKE,
			device: session.device,
			exp: Math.floor(session.exp.getTime() / 1000),
		})
		await activeSessionRepository.deleteById(session.id)

		return { ok: true }
	}
}
