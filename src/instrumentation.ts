import { validateEnv } from '@/config/env'
import { registerGracefulShutdown } from '@/lib/gracefulShutdown'

export async function register() {
	if (process.env.NEXT_RUNTIME === 'edge') {
		return
	}

	validateEnv()
	registerGracefulShutdown()
}
