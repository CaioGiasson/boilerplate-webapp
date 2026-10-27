import { z } from 'zod'
import { ValidationError } from '@/errors'

/**
 * Paginação por cursor (keyset) sobre `createdAt` + `id`. Estável com inserções durante a leitura e sem
 * `skip` (que relê tudo o que ficou para trás). Não conhece o total: use `Pagination` do design system.
 *
 * Uso numa lista nova:
 * 1. Rota: `parsePageQuery(request.nextUrl.searchParams)` → `{ cursor, limit, q, order }`.
 * 2. Repository: `where: { ...filtro, ...keysetWhere(cursor, order) }`, `orderBy: keysetOrderBy(order)`,
 *    `take: limit + 1` (uma a mais diz se há próxima página sem segunda consulta).
 * 3. Use case: `toPage(rows, limit)` e mapeie `items` para o DTO.
 */

export const PAGE_DEFAULT_LIMIT = 20
export const PAGE_MAX_LIMIT = 100
export const PAGE_QUERY_MAX_LENGTH = 100

const CURSOR_MAX_LENGTH = 200
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

export type PageOrder = 'asc' | 'desc'

export type KeysetCursor = {
	createdAt: Date
	id: string
}

export type PageInfo = {
	/** Passe em `cursor` para a próxima página; `null` quando acabou. */
	nextCursor: string | null
	hasNext: boolean
	limit: number
}

export type Page<T> = {
	items: T[]
	pageInfo: PageInfo
}

export const pageQuerySchema = z.object({
	cursor: z.string().min(1).max(CURSOR_MAX_LENGTH).optional(),
	limit: z.coerce.number().int().min(1).max(PAGE_MAX_LIMIT).default(PAGE_DEFAULT_LIMIT),
	q: z
		.string()
		.trim()
		.max(PAGE_QUERY_MAX_LENGTH)
		.optional()
		.transform((value) => value || undefined),
	order: z.enum(['asc', 'desc']).default('desc'),
})

export type PageQuery = {
	cursor?: KeysetCursor
	limit: number
	/** Texto de busca já aparado; `undefined` quando vazio. Quem lista decide em quais campos procurar. */
	q?: string
	order: PageOrder
}

/** Cursor opaco para o cliente: base64url de `{ t: createdAt ISO, i: id }`. */
export function encodeKeysetCursor(cursor: KeysetCursor): string {
	return Buffer.from(JSON.stringify({ t: cursor.createdAt.toISOString(), i: cursor.id })).toString('base64url')
}

/** `null` para qualquer entrada que não seja um cursor emitido por `encodeKeysetCursor`. */
export function decodeKeysetCursor(raw: string): KeysetCursor | null {
	if (raw.length > CURSOR_MAX_LENGTH) return null
	try {
		const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
		if (!parsed || typeof parsed !== 'object') return null
		const { t, i } = parsed as { t?: unknown; i?: unknown }
		if (typeof t !== 'string' || typeof i !== 'string' || !OBJECT_ID_PATTERN.test(i)) return null
		const createdAt = new Date(t)
		return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id: i }
	} catch {
		return null
	}
}

/** Lê `cursor`, `limit`, `q` e `order` da query string; qualquer valor inválido vira `ValidationError` (400). */
export function parsePageQuery(searchParams: URLSearchParams): PageQuery {
	const parsed = pageQuerySchema.safeParse(Object.fromEntries(searchParams))
	if (!parsed.success) {
		const field = parsed.error.issues[0]?.path[0]
		throw new ValidationError(typeof field === 'string' ? `${field} is invalid` : 'Invalid page query')
	}

	const { cursor: rawCursor, limit, q, order } = parsed.data
	let cursor: KeysetCursor | undefined
	if (rawCursor !== undefined) {
		cursor = decodeKeysetCursor(rawCursor) ?? undefined
		if (!cursor) throw new ValidationError('cursor is invalid')
	}
	return { cursor, limit, q, order }
}

export function keysetOrderBy(order: PageOrder): [{ createdAt: PageOrder }, { id: PageOrder }] {
	return [{ createdAt: order }, { id: order }]
}

type KeysetWhere =
	| Record<string, never>
	| {
			OR: [{ createdAt: { lt: Date } | { gt: Date } }, { createdAt: Date; id: { lt: string } | { gt: string } }]
	  }

/**
 * Condição "depois do cursor" para `where`. O desempate por `id` evita pular linhas criadas no mesmo
 * instante (inserção em lote) na virada de página.
 */
export function keysetWhere(cursor: KeysetCursor | undefined, order: PageOrder): KeysetWhere {
	if (!cursor) return {}
	const after = order === 'desc' ? 'lt' : 'gt'
	return {
		OR: [
			{ createdAt: { [after]: cursor.createdAt } as { lt: Date } | { gt: Date } },
			{ createdAt: cursor.createdAt, id: { [after]: cursor.id } as { lt: string } | { gt: string } },
		],
	}
}

/**
 * Corta a linha extra buscada (`limit + 1`) e monta o `pageInfo`. O cursor aponta para a última linha mantida.
 */
export function toPage<T extends { createdAt: Date; id: string }>(
	rows: T[],
	limit: number
): { rows: T[]; pageInfo: PageInfo } {
	const hasNext = rows.length > limit
	const kept = rows.slice(0, limit)
	const last = kept[kept.length - 1]
	return {
		rows: kept,
		pageInfo: {
			nextCursor: hasNext && last ? encodeKeysetCursor({ createdAt: last.createdAt, id: last.id }) : null,
			hasNext,
			limit,
		},
	}
}
