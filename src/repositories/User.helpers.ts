import { Prisma } from '@prisma/client'

/**
 * Soft-delete no MongoDB: `deletedAt` pode ser `null` explícito ou campo ausente.
 * Em Prisma, `{ deletedAt: null }` NÃO inclui documentos sem o campo — por isso o OR.
 * Toda consulta/atualização de usuário ativo deve passar por `activeWhere`.
 */
export const NOT_DELETED_WHERE: Prisma.UserWhereInput = {
	OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
}

/**
 * Combina filtros de negócio com a regra de soft-delete (null ≡ ausente).
 */
export function activeWhere(where: Prisma.UserWhereInput = {}): Prisma.UserWhereInput {
	return {
		AND: [where, NOT_DELETED_WHERE],
	}
}

export function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'
	)
}
