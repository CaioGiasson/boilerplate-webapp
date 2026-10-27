import type { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'
import LogManager from '@/managers/Log.manager'
import { getClientIp, getRequestId } from '@/lib/requestContext'
import type { AuditAction, AuditActorType } from '@/constants/audit'
import { keysetOrderBy, keysetWhere, type KeysetCursor, type PageOrder } from '@/utils/pagination'

export type AuditEventRecord = {
	id: string
	action: string
	actorType: string
	actorId: string | null
	targetUserId: string | null
	metadata: unknown
	ip: string | null
	requestId: string | null
	createdAt: Date
}

export type RecordAuditInput = {
	action: AuditAction
	actorType: AuditActorType
	actorId?: string | null
	targetUserId?: string | null
	/** Só contexto curto e não sensível: nunca senha, token, e-mail nem corpo de requisição. */
	metadata?: Prisma.InputJsonValue
}

/**
 * Append-only: não há `update` nem `delete` por evento. A única remoção é a retenção em lote
 * (`scripts/cron/jobs/retention-purge.mjs`) e a única alteração é zerar o IP na exclusão definitiva da conta.
 */
export default class AuditEventRepository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	/**
	 * Registra um evento com o `requestId` e o IP da requisição em curso. **Nunca lança**: falha de auditoria
	 * é logada e não derruba a ação do usuário. (Dentro de uma transação, erro de banco aborta a transação.)
	 */
	async record(input: RecordAuditInput): Promise<void> {
		try {
			await this.prisma.auditEvent.create({
				data: {
					action: input.action,
					actorType: input.actorType,
					actorId: input.actorId ?? null,
					targetUserId: input.targetUserId ?? null,
					metadata: input.metadata,
					ip: getClientIp() ?? null,
					requestId: getRequestId() ?? null,
				},
			})
		} catch (error: unknown) {
			LogManager.error('Failed to record audit event', { action: input.action, error: String(error) })
		}
	}

	/** Mais recentes primeiro (`order`). `limit` já deve vir com a linha extra (`toPage`). */
	async listPage(input: {
		cursor?: KeysetCursor
		limit: number
		order: PageOrder
		action?: AuditAction
	}): Promise<AuditEventRecord[]> {
		try {
			return await this.prisma.auditEvent.findMany({
				where: {
					...(input.action ? { action: input.action } : {}),
					...keysetWhere(input.cursor, input.order),
				},
				orderBy: keysetOrderBy(input.order),
				take: input.limit,
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list audit events', error)
		}
	}

	/** Eventos em que o usuário agiu ou foi alvo (exportação LGPD). */
	async listByUser(userId: string): Promise<AuditEventRecord[]> {
		try {
			return await this.prisma.auditEvent.findMany({
				where: { OR: [{ actorId: userId }, { targetUserId: userId }] },
				orderBy: { createdAt: 'desc' },
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list audit events for export', error)
		}
	}
}
