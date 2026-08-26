import { Prisma, SessionEventType } from '@prisma/client'
import { RepositoryError } from '@/errors'
import { hashSessionJti } from '@/utils/session'

export default class SessionEventRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async create(input: { jti: string; event: SessionEventType; device: string; exp?: number }): Promise<void> {
		return this.createFromJtiHash({
			jtiHash: hashSessionJti(input.jti),
			event: input.event,
			device: input.device,
			exp: input.exp,
		})
	}

	async createFromJtiHash(input: {
		jtiHash: string
		event: SessionEventType
		device: string
		exp?: number
	}): Promise<void> {
		try {
			await this.purgeExpired()
			await this.prisma.sessionEvent.create({
				data: {
					token: input.jtiHash,
					event: input.event,
					device: input.device,
					exp: input.exp ? new Date(input.exp * 1000) : null,
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to create session event', error)
		}
	}

	async existsForJti(jti: string): Promise<boolean> {
		try {
			await this.purgeExpired()
			const event = await this.prisma.sessionEvent.findFirst({
				where: { token: hashSessionJti(jti) },
				select: { id: true },
			})
			return event !== null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to check session event', error)
		}
	}

	private async purgeExpired(): Promise<void> {
		try {
			await this.prisma.sessionEvent.deleteMany({
				where: { exp: { lt: new Date() } },
			})
		} catch {
			// best-effort
		}
	}
}
