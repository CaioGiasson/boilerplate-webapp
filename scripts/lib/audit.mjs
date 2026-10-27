/**
 * Registro de auditoria para scripts de operador (`actorType: operator`). Espelha `AuditEventRepository.record`
 * (`src/repositories/AuditEvent.repository.ts`) e os nomes de `src/constants/audit.ts`: manter em sync.
 * Nunca lança: o script já fez a alteração; falha de auditoria só avisa.
 */

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ action: string, targetUserId?: string, metadata?: Record<string, unknown> }} event
 */
export async function recordOperatorAudit(prisma, { action, targetUserId, metadata }) {
	try {
		await prisma.auditEvent.create({
			data: {
				action,
				actorType: 'operator',
				targetUserId: targetUserId ?? null,
				metadata: metadata ?? undefined,
			},
		})
	} catch (error) {
		console.warn(
			`Aviso: não consegui registrar a auditoria (${action}): ${error instanceof Error ? error.message : error}`
		)
	}
}
