import { ValidationError } from '@/errors'
import {
	PAGE_DEFAULT_LIMIT,
	PAGE_MAX_LIMIT,
	decodeKeysetCursor,
	encodeKeysetCursor,
	keysetOrderBy,
	keysetWhere,
	parsePageQuery,
	toPage,
} from '@/utils/pagination'

const ID_A = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const ID_B = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const DATE = new Date('2026-10-26T12:00:00.000Z')

function query(params: Record<string, string>) {
	return parsePageQuery(new URLSearchParams(params))
}

describe('cursor', () => {
	it('ida e volta preserva data e id', () => {
		const encoded = encodeKeysetCursor({ createdAt: DATE, id: ID_A })

		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
		expect(decodeKeysetCursor(encoded)).toEqual({ createdAt: DATE, id: ID_A })
	})

	it.each([
		['vazio', ''],
		['lixo', '!!!'],
		['base64 de não-JSON', Buffer.from('nao e json').toString('base64url')],
		['JSON sem campos', Buffer.from('{}').toString('base64url')],
		[
			'id fora do formato ObjectId',
			Buffer.from(JSON.stringify({ t: DATE.toISOString(), i: 'abc' })).toString('base64url'),
		],
		['data inválida', Buffer.from(JSON.stringify({ t: 'ontem', i: ID_A })).toString('base64url')],
		['grande demais', 'a'.repeat(201)],
	])('rejeita cursor %s', (_label, raw) => {
		expect(decodeKeysetCursor(raw)).toBeNull()
	})
})

describe('parsePageQuery', () => {
	it('aplica os padrões', () => {
		expect(query({})).toEqual({ cursor: undefined, limit: PAGE_DEFAULT_LIMIT, q: undefined, order: 'desc' })
	})

	it('lê limit, order, q aparado e cursor', () => {
		const cursor = encodeKeysetCursor({ createdAt: DATE, id: ID_A })

		expect(query({ limit: '50', order: 'asc', q: '  ada  ', cursor })).toEqual({
			cursor: { createdAt: DATE, id: ID_A },
			limit: 50,
			q: 'ada',
			order: 'asc',
		})
	})

	it('q vazio ou só espaços vira undefined', () => {
		expect(query({ q: '   ' }).q).toBeUndefined()
	})

	it.each([
		[{ limit: '0' }, 'limit is invalid'],
		[{ limit: String(PAGE_MAX_LIMIT + 1) }, 'limit is invalid'],
		[{ limit: '1.5' }, 'limit is invalid'],
		[{ limit: 'abc' }, 'limit is invalid'],
		[{ order: 'sideways' }, 'order is invalid'],
		[{ q: 'x'.repeat(101) }, 'q is invalid'],
		[{ cursor: 'quebrado' }, 'cursor is invalid'],
	])('responde ValidationError para %j', (params, message) => {
		expect(() => query(params)).toThrow(ValidationError)
		expect(() => query(params)).toThrow(message)
	})
})

describe('keyset', () => {
	it('sem cursor não filtra', () => {
		expect(keysetWhere(undefined, 'desc')).toEqual({})
	})

	it('desc busca o que vem antes; asc, o que vem depois, sempre com desempate por id', () => {
		const cursor = { createdAt: DATE, id: ID_A }

		expect(keysetWhere(cursor, 'desc')).toEqual({
			OR: [{ createdAt: { lt: DATE } }, { createdAt: DATE, id: { lt: ID_A } }],
		})
		expect(keysetWhere(cursor, 'asc')).toEqual({
			OR: [{ createdAt: { gt: DATE } }, { createdAt: DATE, id: { gt: ID_A } }],
		})
	})

	it('ordena por createdAt e id na mesma direção', () => {
		expect(keysetOrderBy('desc')).toEqual([{ createdAt: 'desc' }, { id: 'desc' }])
		expect(keysetOrderBy('asc')).toEqual([{ createdAt: 'asc' }, { id: 'asc' }])
	})
})

describe('toPage', () => {
	const rows = [
		{ id: ID_A, createdAt: DATE },
		{ id: ID_B, createdAt: new Date('2026-10-25T12:00:00.000Z') },
		{ id: 'cccccccccccccccccccccccc', createdAt: new Date('2026-10-24T12:00:00.000Z') },
	]

	it('com linha extra: corta, marca hasNext e aponta o cursor para a última mantida', () => {
		const page = toPage(rows, 2)

		expect(page.rows).toEqual(rows.slice(0, 2))
		expect(page.pageInfo.hasNext).toBe(true)
		expect(page.pageInfo.limit).toBe(2)
		expect(decodeKeysetCursor(page.pageInfo.nextCursor as string)).toEqual({
			createdAt: rows[1].createdAt,
			id: ID_B,
		})
	})

	it('sem linha extra: última página, sem cursor', () => {
		expect(toPage(rows.slice(0, 2), 2).pageInfo).toEqual({ nextCursor: null, hasNext: false, limit: 2 })
	})

	it('lista vazia', () => {
		expect(toPage([], 20)).toEqual({ rows: [], pageInfo: { nextCursor: null, hasNext: false, limit: 20 } })
	})
})
