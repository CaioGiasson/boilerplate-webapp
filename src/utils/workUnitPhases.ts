import type { Prisma, PrismaClient } from '@prisma/client'
import { getPrismaClient, runInTransaction } from '@/managers/Db.manager'
import type { Injectables } from '@/masterPorts/UseCase.masterport'

export type RootPrismaClient = PrismaClient

/**
 * Root Prisma client for storage phases (ADR-007). Spaces/File side effects are not
 * rolled back with Mongo `$transaction` — use only in phase A/C helpers below.
 */
export function getRootPrismaClient(): RootPrismaClient {
	return getPrismaClient()
}

/**
 * Phase A — storage upload on root (File + Spaces).
 * Phase B — domain write in Mongo transaction (`injectables.prisma`).
 * Phase C — compensate storage if B fails (e.g. orphan object).
 */
export async function runStorageUploadThenTransaction<TStorage, TResult>(params: {
	storageUpload: (root: RootPrismaClient) => Promise<TStorage>
	transactionPhase: (injectables: Injectables, storage: TStorage) => Promise<TResult>
	compensateStorage: (root: RootPrismaClient, storage: TStorage) => Promise<void>
	afterTransaction?: (root: RootPrismaClient, storage: TStorage, result: TResult) => Promise<void>
}): Promise<TResult> {
	const root = getRootPrismaClient()
	const storage = await params.storageUpload(root)
	try {
		const result = await runInTransaction((prisma: Prisma.TransactionClient) =>
			params.transactionPhase({ prisma }, storage)
		)
		if (params.afterTransaction) {
			await params.afterTransaction(root, storage, result)
		}
		return result
	} catch (error) {
		await params.compensateStorage(root, storage)
		throw error
	}
}

/**
 * Phase A — irreversible storage side effect on root (e.g. DeleteObject).
 * Phase B — Mongo transaction for domain rows.
 */
export async function runStorageSideEffectThenTransaction<TResult>(params: {
	storageSideEffect: (root: RootPrismaClient) => Promise<void>
	transactionPhase: (injectables: Injectables) => Promise<TResult>
}): Promise<TResult> {
	const root = getRootPrismaClient()
	await params.storageSideEffect(root)
	return runInTransaction((prisma: Prisma.TransactionClient) => params.transactionPhase({ prisma }))
}

/**
 * Phase B — Mongo transaction first.
 * Phase A — storage cleanup on root after commit (safe when TX must precede Spaces).
 */
export async function runTransactionThenStorageCleanup<TResult>(params: {
	transactionPhase: (injectables: Injectables) => Promise<TResult>
	storageCleanup: (root: RootPrismaClient, result: TResult) => Promise<void>
}): Promise<TResult> {
	const result = await runInTransaction((prisma: Prisma.TransactionClient) => params.transactionPhase({ prisma }))
	const root = getRootPrismaClient()
	await params.storageCleanup(root, result)
	return result
}
