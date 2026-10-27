import { PrismaClient } from '@prisma/client'
import { e2eDatabaseUrl } from './env'

/** Prefixo das contas dos testes: a limpeza só apaga o que começa com ele. */
export const E2E_NICKNAME_PREFIX = 'e2e_'

let client: PrismaClient | undefined

function prisma(): PrismaClient {
	client ??= new PrismaClient({ datasourceUrl: e2eDatabaseUrl() })
	return client
}

/** Equivale a abrir o link do e-mail de verificação (o e-mail não sai nos testes: o provedor é falso). */
export async function markEmailVerified(email: string): Promise<void> {
	await prisma().user.updateMany({ where: { email }, data: { emailVerifiedAt: new Date() } })
}

export async function findTwoFactorState(email: string) {
	return prisma().user.findFirst({
		where: { email },
		select: { twoFactorEnabledAt: true, twoFactorSecretEnc: true, twoFactorPendingSecretEnc: true },
	})
}

export async function deleteE2eUsers(): Promise<void> {
	const users = await prisma().user.findMany({
		where: { nickname: { startsWith: E2E_NICKNAME_PREFIX } },
		select: { id: true },
	})
	const ids = users.map((user) => user.id)
	if (ids.length === 0) return
	await prisma().twoFactorRecoveryCode.deleteMany({ where: { userId: { in: ids } } })
	await prisma().activeSession.deleteMany({ where: { userId: { in: ids } } })
	await prisma().auditEvent.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { targetUserId: { in: ids } }] } })
	await prisma().user.deleteMany({ where: { id: { in: ids } } })
}

export async function disconnectDb(): Promise<void> {
	await client?.$disconnect()
	client = undefined
}
