import type { Prisma } from '@prisma/client'
import { runInTransaction, runWithoutTransaction } from '@/managers/Db.manager'
import LogManager from '@/managers/Log.manager'

export type Injectables = {
	prisma: Prisma.TransactionClient
}

export default abstract class UseCaseMasterPort<Input, Output> {
	/**
	 * When `false`, the use case runs against the root Prisma client without `$transaction`.
	 * Override on read-only use cases (list/get) — keep `true` for multi-write mutations.
	 */
	protected get transactional(): boolean {
		return true
	}

	protected abstract validate(input: Input): Promise<void>
	protected abstract execute(input: Input, injectables: Injectables): Promise<Output>

	async run(input: Input): Promise<Output> {
		LogManager.info(`Running use case ${this.constructor.name}`)
		let output: Output

		try {
			await this.validate(input)
			if (this.transactional) {
				output = await runInTransaction(async (prisma) => {
					return this.execute(input, { prisma })
				})
			} else {
				output = await runWithoutTransaction(async (prisma) => {
					return this.execute(input, { prisma: prisma as Prisma.TransactionClient })
				})
			}
		} catch (error: unknown) {
			LogManager.error(`Error running use case ${this.constructor.name}`, error)
			throw error
		} finally {
			LogManager.info(`Use case ${this.constructor.name} completed`)
		}

		return output
	}
}
