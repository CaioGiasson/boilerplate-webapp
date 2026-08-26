import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import ActiveSessionRepository from '@/repositories/ActiveSession.repository'
import { ValidationError } from '@/errors'
import { hashSessionJti } from '@/utils/session'

type Input = {
	userId: string
	currentJti: string
}

export type ListedUserSession = {
	id: string
	device: string
	createdAt: Date
	exp: Date
	current: boolean
}

type Output = {
	sessions: ListedUserSession[]
}

export default class ListUserSessions extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

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
		const rows = await activeSessionRepository.listByUserId(input.userId)
		const currentHash = hashSessionJti(input.currentJti)

		return {
			sessions: rows.map((row) => ({
				id: row.id,
				device: row.device,
				createdAt: row.createdAt,
				exp: row.exp,
				current: row.jtiHash === currentHash,
			})),
		}
	}
}
