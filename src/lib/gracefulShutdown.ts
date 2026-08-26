import { getPrismaClient } from '@/managers/Db.manager'
import LogManager from '@/managers/Log.manager'

let registered = false
let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
	if (shuttingDown) {
		return
	}
	shuttingDown = true

	LogManager.info(`Graceful shutdown: received ${signal}, disconnecting Prisma`)
	try {
		await getPrismaClient().$disconnect()
		LogManager.info('Graceful shutdown: Prisma disconnected')
	} catch (error: unknown) {
		LogManager.error('Graceful shutdown: Prisma disconnect failed', error)
	}

	process.exit(0)
}

/** Registers SIGTERM/SIGINT handlers (Node server / Next standalone). REL-03 */
export function registerGracefulShutdown(): void {
	if (registered || process.env.NEXT_RUNTIME === 'edge') {
		return
	}
	registered = true

	process.once('SIGTERM', () => {
		void shutdown('SIGTERM')
	})
	process.once('SIGINT', () => {
		void shutdown('SIGINT')
	})
}
