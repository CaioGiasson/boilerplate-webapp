import { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'
import { hashSessionJti } from '@/utils/session'

export type ActiveSessionRecord = {
	id: string
	userId: string
	jtiHash: string
	device: string
	createdAt: Date
	exp: Date
}

export default class ActiveSessionRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async create(input: { userId: string; jti: string; device: string; exp: number }): Promise<ActiveSessionRecord> {
		try {
			return await this.prisma.activeSession.create({
				data: {
					userId: input.userId,
					jtiHash: hashSessionJti(input.jti),
					device: input.device,
					exp: new Date(input.exp * 1000),
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to create active session', error)
		}
	}

	/**
	 * Self-heal / idempotent write for tokens issued before ActiveSession existed.
	 */
	async upsertFromClaims(input: {
		userId: string
		jti: string
		device: string
		exp: number
	}): Promise<ActiveSessionRecord> {
		try {
			const jtiHash = hashSessionJti(input.jti)
			return await this.prisma.activeSession.upsert({
				where: { jtiHash },
				create: {
					userId: input.userId,
					jtiHash,
					device: input.device,
					exp: new Date(input.exp * 1000),
				},
				update: {},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to upsert active session', error)
		}
	}

	async listByUserId(userId: string): Promise<ActiveSessionRecord[]> {
		try {
			await this.purgeExpired()
			return await this.prisma.activeSession.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list active sessions', error)
		}
	}

	async findByIdForUser(id: string, userId: string): Promise<ActiveSessionRecord | null> {
		try {
			return await this.prisma.activeSession.findFirst({
				where: { id, userId },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find active session', error)
		}
	}

	async deleteById(id: string): Promise<void> {
		try {
			await this.prisma.activeSession.delete({ where: { id } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete active session', error)
		}
	}

	async deleteAllForUserExceptJti(userId: string, jti: string): Promise<void> {
		try {
			await this.prisma.activeSession.deleteMany({
				where: {
					userId,
					jtiHash: { not: hashSessionJti(jti) },
				},
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete other active sessions', error)
		}
	}

	async deleteAllForUser(userId: string): Promise<number> {
		try {
			const result = await this.prisma.activeSession.deleteMany({
				where: { userId },
			})
			return result.count
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete all active sessions for user', error)
		}
	}

	async deleteByJti(jti: string): Promise<void> {
		try {
			await this.prisma.activeSession.deleteMany({
				where: { jtiHash: hashSessionJti(jti) },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete active session by jti', error)
		}
	}

	async existsForJti(jti: string): Promise<boolean> {
		try {
			const row = await this.prisma.activeSession.findUnique({
				where: { jtiHash: hashSessionJti(jti) },
				select: { id: true },
			})
			return row !== null
		} catch (error: unknown) {
			throw new RepositoryError('Failed to check active session', error)
		}
	}

	async purgeExpired(): Promise<void> {
		try {
			await this.prisma.activeSession.deleteMany({
				where: { exp: { lt: new Date() } },
			})
		} catch {
			// best-effort
		}
	}
}
