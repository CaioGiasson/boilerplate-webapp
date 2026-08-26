import { SessionEventType } from '@prisma/client'
import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import SessionEventRepository from '@/repositories/SessionEvent.repository'
import { ValidationError } from '@/errors'
import { verifySessionToken } from '@/utils/session'

type Input = {
	token: string
}

type Output = {
	ok: true
}

export default class LogoutUser extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.token?.trim()) {
			throw new ValidationError('Session token is required')
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const session = await verifySessionToken(input.token)
		const sessionEventRepository = new SessionEventRepository(injectables.prisma)
		const activeSessionRepository = new ActiveSessionRepository(injectables.prisma)
		const alreadyRevoked = await sessionEventRepository.existsForJti(session.jti)

		if (!alreadyRevoked) {
			await sessionEventRepository.create({
				jti: session.jti,
				event: SessionEventType.LOGOUT,
				device: session.device,
				exp: session.exp,
			})
		}

		await activeSessionRepository.deleteByJti(session.jti)

		return { ok: true }
	}
}
