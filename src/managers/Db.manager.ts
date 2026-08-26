import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
	prismaClient: PrismaClient | undefined
}

/**
 * Process-wide Prisma client (DI-03). Do not create PrismaClient per request.
 */
export function getPrismaClient(): PrismaClient {
	if (!globalForPrisma.prismaClient) {
		globalForPrisma.prismaClient = new PrismaClient()
	}

	return globalForPrisma.prismaClient
}

/** Multi-write mutations — Mongo `$transaction`. */
export async function runInTransaction<T>(func: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return getPrismaClient().$transaction(async (prisma: Prisma.TransactionClient) => {
		return func(prisma)
	})
}

/** Read-only path without opening a Prisma transaction (DATA-05). */
export async function runWithoutTransaction<T>(func: (client: PrismaClient) => Promise<T>): Promise<T> {
	return func(getPrismaClient())
}
