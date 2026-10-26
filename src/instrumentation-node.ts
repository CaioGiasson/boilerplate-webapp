import { validateEnv } from '@/config/env'
import { registerGracefulShutdown } from '@/lib/gracefulShutdown'

/** Inicialização que só roda no runtime Node (Prisma e handlers de processo não existem na Edge). */
export function registerNodeInstrumentation(): void {
	validateEnv()
	registerGracefulShutdown()
}
