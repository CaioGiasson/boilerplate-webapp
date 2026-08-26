import * as Db from '@/managers/Db.manager'

/**
 * Mocks transactional and read paths for use case unit tests.
 * Call in beforeEach / per test with the fake prisma client.
 */
export function mockPrismaRuntime(prisma: unknown): void {
	const run = jest.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(prisma))
	jest.spyOn(Db, 'runInTransaction').mockImplementation(run as typeof Db.runInTransaction)
	jest.spyOn(Db, 'runWithoutTransaction').mockImplementation(run as typeof Db.runWithoutTransaction)
}
