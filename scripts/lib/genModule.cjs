/**
 * Regras do `gen:module` (CommonJS, sem TypeScript): gera um CRUD de entidade do usuário, camada por camada.
 * Funções puras (spec → arquivos/patches); a leitura/escrita de arquivos fica em `scripts/gen-module.mjs`.
 * Testado em `tests/scripts/genModule.test.ts`.
 */

const RESERVED_FIELDS = ['id', 'userId', 'createdAt', 'updatedAt']

/** Tipos aceitos em `--fields`. `sample` alimenta os testes gerados. */
const FIELD_TYPES = {
	string: { prisma: 'String', ts: 'string', zod: 'z.string().trim().min(1).max(200)', sample: "'Exemplo'" },
	int: { prisma: 'Int', ts: 'number', zod: 'z.number().int()', sample: '1' },
	float: { prisma: 'Float', ts: 'number', zod: 'z.number()', sample: '1.5' },
	boolean: { prisma: 'Boolean', ts: 'boolean', zod: 'z.boolean()', sample: 'true' },
	date: { prisma: 'DateTime', ts: 'Date', zod: 'z.coerce.date()', sample: "new Date('2026-10-26T12:00:00.000Z')" },
}

function camel(value) {
	return value.charAt(0).toLowerCase() + value.slice(1)
}

function kebab(value) {
	return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Plural simples em inglês (nomes de código). Use `--plural` quando não servir. */
function pluralize(word) {
	if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`
	if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`
	return `${word}s`
}

/**
 * @param {string} raw ex.: `title:string,done:boolean?,dueAt:date?`
 */
function parseFields(raw) {
	const items = raw
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
	if (items.length === 0) throw new Error('--fields está vazio.')

	const seen = new Set()
	return items.map((item) => {
		const match = /^([a-z][A-Za-z0-9]*):([a-z]+)(\?)?$/.exec(item)
		if (!match)
			throw new Error(`Campo inválido "${item}". Use nome:tipo ou nome:tipo? (ex.: title:string, dueAt:date?).`)
		const [, name, type, optional] = match
		if (!FIELD_TYPES[type])
			throw new Error(`Tipo "${type}" inválido em "${item}". Tipos: ${Object.keys(FIELD_TYPES).join(', ')}.`)
		if (RESERVED_FIELDS.includes(name))
			throw new Error(`Campo "${name}" é reservado (${RESERVED_FIELDS.join(', ')}).`)
		if (seen.has(name)) throw new Error(`Campo "${name}" repetido.`)
		seen.add(name)
		return { name, type, optional: Boolean(optional), ...FIELD_TYPES[type] }
	})
}

/**
 * @param {{ name: string, fields?: string, plural?: string }} input
 */
function buildSpec({ name, fields = 'name:string', plural }) {
	if (!/^[A-Z][A-Za-z0-9]*$/.test(name ?? '')) {
		throw new Error('Nome inválido. Use PascalCase em inglês, ex.: Task ou ProjectItem.')
	}
	const pluralName = plural ?? pluralize(name)
	if (!/^[A-Z][A-Za-z0-9]*$/.test(pluralName)) throw new Error('--plural inválido. Use PascalCase.')
	if (pluralName === name) throw new Error('O plural não pode ser igual ao singular; informe --plural.')

	return {
		Name: name,
		name: camel(name),
		Plural: pluralName,
		plural: camel(pluralName),
		route: kebab(pluralName),
		fields: parseFields(fields),
	}
}

/** Primeiro campo string: é onde a busca `q` procura. */
function searchField(spec) {
	return spec.fields.find((field) => field.type === 'string')
}

const tsType = (field) => (field.optional ? `${field.ts} | null` : field.ts)

// ---------------------------------------------------------------------------------------------------------------------
// Arquivos novos
// ---------------------------------------------------------------------------------------------------------------------

function prismaModel(spec) {
	const lines = spec.fields.map((field) => `  ${field.name.padEnd(9)} ${field.prisma}${field.optional ? '?' : ''}`)
	return `/// ${spec.Name}: gerado por \`npm run gen:module\`. Pertence a um usuário; é dado pessoal (exportação e exclusão de conta).
model ${spec.Name} {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
${lines.join('\n')}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, createdAt])
}
`
}

function schemaFile(spec) {
	const lines = spec.fields.map((field) => `\t${field.name}: ${field.zod}${field.optional ? '.nullish()' : ''},`)
	return `import { z } from 'zod'

/** \`.strict()\` recusa campos desconhecidos (evita mass assignment: userId, id, createdAt…). */
export const create${spec.Name}BodySchema = z
	.object({
${lines.map((line) => `\t${line}`).join('\n')}
	})
	.strict()

export const update${spec.Name}BodySchema = create${spec.Name}BodySchema.partial()
`
}

function dtoFile(spec) {
	const recordFields = spec.fields.map((field) => `\t${field.name}: ${tsType(field)}`)
	const dtoFields = spec.fields.map((field) => {
		const base = field.type === 'date' ? 'string' : field.ts
		return `\t${field.name}: ${field.optional ? `${base} | null` : base}`
	})
	const dtoMap = spec.fields.map((field) => {
		if (field.type !== 'date') return `\t\t${field.name}: record.${field.name},`
		return field.optional
			? `\t\t${field.name}: record.${field.name} ? record.${field.name}.toISOString() : null,`
			: `\t\t${field.name}: record.${field.name}.toISOString(),`
	})
	return `export type ${spec.Name}Record = {
	id: string
	userId: string
${recordFields.join('\n')}
	createdAt: Date
	updatedAt: Date
}

/** O que sai pela API: sem \`userId\` e com datas em ISO. */
export type ${spec.Name}Dto = {
	id: string
${dtoFields.join('\n')}
	createdAt: string
	updatedAt: string
}

export function to${spec.Name}Dto(record: ${spec.Name}Record): ${spec.Name}Dto {
	return {
		id: record.id,
${dtoMap.join('\n')}
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	}
}
`
}

function repositoryFile(spec) {
	const dataFields = spec.fields.map((field) => `\t${field.name}${field.optional ? '?' : ''}: ${tsType(field)}`)
	const search = searchField(spec)
	const searchClause = search
		? `...(input.q ? { ${search.name}: { contains: input.q, mode: 'insensitive' as const } } : {}),\n\t\t\t\t\t`
		: ''
	return `import type { Prisma } from '@prisma/client'
import { RepositoryError } from '@/errors'
import { keysetOrderBy, keysetWhere, type KeysetCursor, type PageOrder } from '@/utils/pagination'
import type { ${spec.Name}Record } from '@/repositories/${spec.Name}.dto'

export type { ${spec.Name}Record } from '@/repositories/${spec.Name}.dto'

export type ${spec.Name}Data = {
${dataFields.join('\n')}
}

export type ${spec.Name}Patch = Partial<${spec.Name}Data>

/** Toda consulta filtra por \`userId\`: outro dono responde igual a inexistente. */
export default class ${spec.Name}Repository {
	private prisma: Prisma.TransactionClient

	constructor(prisma: Prisma.TransactionClient) {
		this.prisma = prisma
	}

	async create(userId: string, data: ${spec.Name}Data): Promise<${spec.Name}Record> {
		try {
			return await this.prisma.${spec.name}.create({ data: { userId, ...data } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to create ${spec.name}', error)
		}
	}

	async findById(userId: string, id: string): Promise<${spec.Name}Record | null> {
		try {
			return await this.prisma.${spec.name}.findFirst({ where: { id, userId } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to find ${spec.name}', error)
		}
	}

	/** \`limit\` já deve vir com a linha extra (\`toPage\`). */
	async listByUser(input: {
		userId: string
		cursor?: KeysetCursor
		limit: number
		order: PageOrder
		q?: string
	}): Promise<${spec.Name}Record[]> {
		try {
			return await this.prisma.${spec.name}.findMany({
				where: {
					userId: input.userId,
					${searchClause}...keysetWhere(input.cursor, input.order),
				},
				orderBy: keysetOrderBy(input.order),
				take: input.limit,
			})
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list ${spec.plural}', error)
		}
	}

	/** \`null\` quando não existe (ou é de outro dono). */
	async update(userId: string, id: string, patch: ${spec.Name}Patch): Promise<${spec.Name}Record | null> {
		try {
			const { count } = await this.prisma.${spec.name}.updateMany({ where: { id, userId }, data: patch })
			if (count === 0) return null
			return await this.prisma.${spec.name}.findFirst({ where: { id, userId } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to update ${spec.name}', error)
		}
	}

	async delete(userId: string, id: string): Promise<boolean> {
		try {
			const { count } = await this.prisma.${spec.name}.deleteMany({ where: { id, userId } })
			return count > 0
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete ${spec.name}', error)
		}
	}

	/** Para a exportação LGPD (\`exportUserData\`). */
	async listAllByUser(userId: string): Promise<${spec.Name}Record[]> {
		try {
			return await this.prisma.${spec.name}.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
		} catch (error: unknown) {
			throw new RepositoryError('Failed to list ${spec.plural} for export', error)
		}
	}

	/** Para a exclusão definitiva da conta (\`retention-purge\`). */
	async deleteAllByUser(userId: string): Promise<number> {
		try {
			const { count } = await this.prisma.${spec.name}.deleteMany({ where: { userId } })
			return count
		} catch (error: unknown) {
			throw new RepositoryError('Failed to delete ${spec.plural} of user', error)
		}
	}
}
`
}

const OBJECT_ID_LINE = 'const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i\n'

function createUseCase(spec) {
	return `import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import ${spec.Name}Repository, { type ${spec.Name}Data } from '@/repositories/${spec.Name}.repository'
import { to${spec.Name}Dto, type ${spec.Name}Dto } from '@/repositories/${spec.Name}.dto'

type Input = {
	userId: string
	data: ${spec.Name}Data
}

type Output = {
	item: ${spec.Name}Dto
}

export default class Create${spec.Name} extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const record = await new ${spec.Name}Repository(injectables.prisma).create(input.userId, input.data)
		return { item: to${spec.Name}Dto(record) }
	}
}
`
}

function getUseCase(spec) {
	return `import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, ValidationError } from '@/errors'
import ${spec.Name}Repository from '@/repositories/${spec.Name}.repository'
import { to${spec.Name}Dto, type ${spec.Name}Dto } from '@/repositories/${spec.Name}.dto'

${OBJECT_ID_LINE}
type Input = {
	userId: string
	${spec.name}Id: string
}

type Output = {
	item: ${spec.Name}Dto
}

export default class Get${spec.Name} extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!OBJECT_ID_PATTERN.test(input.${spec.name}Id ?? '')) throw new NotFoundError('${spec.Name} not found')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const record = await new ${spec.Name}Repository(injectables.prisma).findById(input.userId, input.${spec.name}Id)
		// Outro dono responde igual a inexistente: não confirma que o id existe.
		if (!record) throw new NotFoundError('${spec.Name} not found')
		return { item: to${spec.Name}Dto(record) }
	}
}
`
}

function listUseCase(spec) {
	return `import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { ValidationError } from '@/errors'
import ${spec.Name}Repository from '@/repositories/${spec.Name}.repository'
import { to${spec.Name}Dto, type ${spec.Name}Dto } from '@/repositories/${spec.Name}.dto'
import { PAGE_DEFAULT_LIMIT, PAGE_MAX_LIMIT, toPage, type KeysetCursor, type Page, type PageOrder } from '@/utils/pagination'

type Input = {
	userId: string
	/** Vem de \`parsePageQuery\` (já decodificado). */
	cursor?: KeysetCursor
	limit?: number
	q?: string
	order?: PageOrder
}

type Output = Page<${spec.Name}Dto>

export default class List${spec.Plural} extends UseCaseMasterPort<Input, Output> {
	protected override get transactional(): boolean {
		return false
	}

	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (
			input.limit !== undefined &&
			(!Number.isInteger(input.limit) || input.limit < 1 || input.limit > PAGE_MAX_LIMIT)
		) {
			throw new ValidationError(\`limit must be between 1 and \${PAGE_MAX_LIMIT}\`)
		}
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const limit = input.limit ?? PAGE_DEFAULT_LIMIT
		const { rows, pageInfo } = toPage(
			await new ${spec.Name}Repository(injectables.prisma).listByUser({
				userId: input.userId,
				cursor: input.cursor,
				limit: limit + 1,
				order: input.order ?? 'desc',
				q: input.q,
			}),
			limit
		)
		return { items: rows.map(to${spec.Name}Dto), pageInfo }
	}
}
`
}

function updateUseCase(spec) {
	return `import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, ValidationError } from '@/errors'
import ${spec.Name}Repository, { type ${spec.Name}Patch } from '@/repositories/${spec.Name}.repository'
import { to${spec.Name}Dto, type ${spec.Name}Dto } from '@/repositories/${spec.Name}.dto'

${OBJECT_ID_LINE}
type Input = {
	userId: string
	${spec.name}Id: string
	patch: ${spec.Name}Patch
}

type Output = {
	item: ${spec.Name}Dto
}

export default class Update${spec.Name} extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!OBJECT_ID_PATTERN.test(input.${spec.name}Id ?? '')) throw new NotFoundError('${spec.Name} not found')
		if (Object.keys(input.patch ?? {}).length === 0) throw new ValidationError('Nothing to update')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const record = await new ${spec.Name}Repository(injectables.prisma).update(
			input.userId,
			input.${spec.name}Id,
			input.patch
		)
		if (!record) throw new NotFoundError('${spec.Name} not found')
		return { item: to${spec.Name}Dto(record) }
	}
}
`
}

function deleteUseCase(spec) {
	return `import UseCaseMasterPort, { Injectables } from '@/masterPorts/UseCase.masterport'
import { NotFoundError, ValidationError } from '@/errors'
import ${spec.Name}Repository from '@/repositories/${spec.Name}.repository'

${OBJECT_ID_LINE}
type Input = {
	userId: string
	${spec.name}Id: string
}

type Output = {
	ok: true
}

export default class Delete${spec.Name} extends UseCaseMasterPort<Input, Output> {
	async validate(input: Input): Promise<void> {
		if (!input.userId?.trim()) throw new ValidationError('User id is required')
		if (!OBJECT_ID_PATTERN.test(input.${spec.name}Id ?? '')) throw new NotFoundError('${spec.Name} not found')
	}

	async execute(input: Input, injectables: Injectables): Promise<Output> {
		const deleted = await new ${spec.Name}Repository(injectables.prisma).delete(input.userId, input.${spec.name}Id)
		if (!deleted) throw new NotFoundError('${spec.Name} not found')
		return { ok: true }
	}
}
`
}

function routeFile(spec, kind) {
	const common = `import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/managers/Db.manager'
import ApiPresenter from '@/utils/Api.presenter'
import { handleRoute } from '@/utils/routeHandler'
import { requireAuth } from '@/middleware/auth.middleware'
`
	if (kind === 'list') {
		return `${common}import { parsePageQuery } from '@/utils/pagination'
import type List${spec.Plural} from '@/useCases/list${spec.Plural}.usecase'

type Dependencies = {
	list${spec.Plural}UseCase: List${spec.Plural}
}

export default async function list${spec.Plural}Route(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		const { cursor, limit, q, order } = parsePageQuery(request.nextUrl.searchParams)
		const result = await dependencies.list${spec.Plural}UseCase.run({ userId: session.userId, cursor, limit, q, order })

		return NextResponse.json(ApiPresenter.success('${spec.Plural} listed', result), {
			status: 200,
			headers: { 'Cache-Control': 'no-store' },
		})
	})
}
`
	}
	if (kind === 'create') {
		return `${common}import { ValidationError } from '@/errors'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { parseJsonBodyUnknown } from '@/utils/routeHandler'
import { create${spec.Name}BodySchema } from '@/schemas/${spec.name}.schema'
import type Create${spec.Name} from '@/useCases/create${spec.Name}.usecase'

type Dependencies = {
	create${spec.Name}UseCase: Create${spec.Name}
}

export default async function create${spec.Name}Route(
	request: NextRequest,
	dependencies: Dependencies
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())

		const parsed = create${spec.Name}BodySchema.safeParse(await parseJsonBodyUnknown(request))
		if (!parsed.success) throw new ValidationError('Invalid request body')

		const result = await dependencies.create${spec.Name}UseCase.run({ userId: session.userId, data: parsed.data })
		return NextResponse.json(ApiPresenter.success('${spec.Name} created', result), { status: 201 })
	})
}
`
	}
	if (kind === 'get') {
		return `${common}import type Get${spec.Name} from '@/useCases/get${spec.Name}.usecase'

type Dependencies = {
	get${spec.Name}UseCase: Get${spec.Name}
}

export default async function get${spec.Name}Route(
	request: NextRequest,
	dependencies: Dependencies,
	${spec.name}Id: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.get${spec.Name}UseCase.run({ userId: session.userId, ${spec.name}Id })

		return NextResponse.json(ApiPresenter.success('${spec.Name} found', result), {
			status: 200,
			headers: { 'Cache-Control': 'no-store' },
		})
	})
}
`
	}
	if (kind === 'update') {
		return `${common}import { ValidationError } from '@/errors'
import { assertSameOrigin } from '@/utils/csrfOrigin'
import { parseJsonBodyUnknown } from '@/utils/routeHandler'
import { update${spec.Name}BodySchema } from '@/schemas/${spec.name}.schema'
import type Update${spec.Name} from '@/useCases/update${spec.Name}.usecase'

type Dependencies = {
	update${spec.Name}UseCase: Update${spec.Name}
}

export default async function update${spec.Name}Route(
	request: NextRequest,
	dependencies: Dependencies,
	${spec.name}Id: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())

		const parsed = update${spec.Name}BodySchema.safeParse(await parseJsonBodyUnknown(request))
		if (!parsed.success) throw new ValidationError('Invalid request body')

		const result = await dependencies.update${spec.Name}UseCase.run({
			userId: session.userId,
			${spec.name}Id,
			patch: parsed.data,
		})
		return NextResponse.json(ApiPresenter.success('${spec.Name} updated', result), { status: 200 })
	})
}
`
	}
	return `${common}import { assertSameOrigin } from '@/utils/csrfOrigin'
import type Delete${spec.Name} from '@/useCases/delete${spec.Name}.usecase'

type Dependencies = {
	delete${spec.Name}UseCase: Delete${spec.Name}
}

export default async function delete${spec.Name}Route(
	request: NextRequest,
	dependencies: Dependencies,
	${spec.name}Id: string
): Promise<NextResponse> {
	return handleRoute(async () => {
		assertSameOrigin(request)
		const session = await requireAuth(request, getPrismaClient())
		const result = await dependencies.delete${spec.Name}UseCase.run({ userId: session.userId, ${spec.name}Id })

		return NextResponse.json(ApiPresenter.success('${spec.Name} deleted', result), { status: 200 })
	})
}
`
}

function controllerFile(spec) {
	return `import { NextRequest, NextResponse } from 'next/server'
import list${spec.Plural}Route from './routes/list.route'
import create${spec.Name}Route from './routes/create.route'
import get${spec.Name}Route from './routes/get.route'
import update${spec.Name}Route from './routes/update.route'
import delete${spec.Name}Route from './routes/delete.route'
import type List${spec.Plural} from '@/useCases/list${spec.Plural}.usecase'
import type Create${spec.Name} from '@/useCases/create${spec.Name}.usecase'
import type Get${spec.Name} from '@/useCases/get${spec.Name}.usecase'
import type Update${spec.Name} from '@/useCases/update${spec.Name}.usecase'
import type Delete${spec.Name} from '@/useCases/delete${spec.Name}.usecase'

type Dependencies = {
	list${spec.Plural}UseCase: List${spec.Plural}
	create${spec.Name}UseCase: Create${spec.Name}
	get${spec.Name}UseCase: Get${spec.Name}
	update${spec.Name}UseCase: Update${spec.Name}
	delete${spec.Name}UseCase: Delete${spec.Name}
}

export default class ${spec.Name}Controller {
	static list(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return list${spec.Plural}Route(request, dependencies)
	}

	static create(request: NextRequest, dependencies: Dependencies): Promise<NextResponse> {
		return create${spec.Name}Route(request, dependencies)
	}

	static get(request: NextRequest, dependencies: Dependencies, ${spec.name}Id: string): Promise<NextResponse> {
		return get${spec.Name}Route(request, dependencies, ${spec.name}Id)
	}

	static update(request: NextRequest, dependencies: Dependencies, ${spec.name}Id: string): Promise<NextResponse> {
		return update${spec.Name}Route(request, dependencies, ${spec.name}Id)
	}

	static remove(request: NextRequest, dependencies: Dependencies, ${spec.name}Id: string): Promise<NextResponse> {
		return delete${spec.Name}Route(request, dependencies, ${spec.name}Id)
	}
}
`
}

function appCollectionRoute(spec) {
	return `import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import ${spec.Name}Controller from '@/controllers/${spec.Name}/${spec.Name}.controller'

export async function GET(request: NextRequest) {
	return ${spec.Name}Controller.list(request, getDependencies())
}

export async function POST(request: NextRequest) {
	return ${spec.Name}Controller.create(request, getDependencies())
}
`
}

function appItemRoute(spec) {
	return `import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import ${spec.Name}Controller from '@/controllers/${spec.Name}/${spec.Name}.controller'

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
	const { id } = await context.params
	return ${spec.Name}Controller.get(request, getDependencies(), id)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const { id } = await context.params
	return ${spec.Name}Controller.update(request, getDependencies(), id)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const { id } = await context.params
	return ${spec.Name}Controller.remove(request, getDependencies(), id)
}
`
}

function sampleRecordLines(spec, indent) {
	return spec.fields.map((field) => `${indent}${field.name}: ${field.sample},`).join('\n')
}

function testForUseCases(spec) {
	const sampleData = sampleRecordLines(spec, '\t')
	const dtoExpect = spec.fields
		.map((field) => {
			const value = field.type === 'date' ? `'2026-10-26T12:00:00.000Z'` : field.sample
			return `\t\t\t${field.name}: ${value},`
		})
		.join('\n')
	const patchField = spec.fields[0]
	const patchValue = patchField.sample
	return `import Create${spec.Name} from '@/useCases/create${spec.Name}.usecase'
import Get${spec.Name} from '@/useCases/get${spec.Name}.usecase'
import List${spec.Plural} from '@/useCases/list${spec.Plural}.usecase'
import Update${spec.Name} from '@/useCases/update${spec.Name}.usecase'
import Delete${spec.Name} from '@/useCases/delete${spec.Name}.usecase'
import { NotFoundError, ValidationError } from '@/errors'
import { PAGE_DEFAULT_LIMIT, decodeKeysetCursor } from '@/utils/pagination'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

const USER_ID = '507f1f77bcf86cd799439011'
const ITEM_ID = '507f1f77bcf86cd799439012'
const CREATED_AT = new Date('2026-10-26T12:00:00.000Z')

const DATA = {
${sampleData}
}

function record(overrides: Record<string, unknown> = {}) {
	return { id: ITEM_ID, userId: USER_ID, ...DATA, createdAt: CREATED_AT, updatedAt: CREATED_AT, ...overrides }
}

describe('Create${spec.Name}', () => {
	it('grava para o usuário e devolve o DTO sem userId', async () => {
		const create = jest.fn(async () => record())
		mockPrismaRuntime({ ${spec.name}: { create } })

		const result = await new Create${spec.Name}().run({ userId: USER_ID, data: DATA })

		expect(create).toHaveBeenCalledWith({ data: { userId: USER_ID, ...DATA } })
		expect(result.item).toEqual({
			id: ITEM_ID,
${dtoExpect}
			createdAt: '2026-10-26T12:00:00.000Z',
			updatedAt: '2026-10-26T12:00:00.000Z',
		})
		expect(JSON.stringify(result)).not.toContain('userId')
	})

	it('exige o usuário', async () => {
		mockPrismaRuntime({ ${spec.name}: {} })

		await expect(new Create${spec.Name}().run({ userId: ' ', data: DATA })).rejects.toBeInstanceOf(ValidationError)
	})
})

describe('Get${spec.Name}', () => {
	it('busca pelo dono e devolve o item', async () => {
		const findFirst = jest.fn(async () => record())
		mockPrismaRuntime({ ${spec.name}: { findFirst } })

		const result = await new Get${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: ITEM_ID })

		expect(findFirst).toHaveBeenCalledWith({ where: { id: ITEM_ID, userId: USER_ID } })
		expect(result.item.id).toBe(ITEM_ID)
	})

	it('responde não encontrado para outro dono ou id inexistente', async () => {
		mockPrismaRuntime({ ${spec.name}: { findFirst: jest.fn(async () => null) } })

		await expect(new Get${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: ITEM_ID })).rejects.toBeInstanceOf(NotFoundError)
	})

	it('id fora do formato responde não encontrado sem consultar o banco', async () => {
		const findFirst = jest.fn()
		mockPrismaRuntime({ ${spec.name}: { findFirst } })

		await expect(new Get${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: 'abc' })).rejects.toBeInstanceOf(NotFoundError)
		expect(findFirst).not.toHaveBeenCalled()
	})
})

describe('List${spec.Plural}', () => {
	it('filtra pelo dono, busca uma linha a mais e devolve o cursor', async () => {
		const older = new Date('2026-10-25T12:00:00.000Z')
		const findMany = jest.fn(async () => [
			record(),
			record({ id: '507f1f77bcf86cd799439013', createdAt: older, updatedAt: older }),
		])
		mockPrismaRuntime({ ${spec.name}: { findMany } })

		const result = await new List${spec.Plural}().run({ userId: USER_ID, limit: 1 })

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 2 })
		)
		expect(JSON.stringify((findMany.mock.calls[0] as unknown[])[0])).toContain(USER_ID)
		expect(result.items).toHaveLength(1)
		expect(result.pageInfo.hasNext).toBe(true)
		expect(decodeKeysetCursor(result.pageInfo.nextCursor as string)).toEqual({ createdAt: CREATED_AT, id: ITEM_ID })
	})

	it('usa o limite padrão e recusa limite inválido', async () => {
		const findMany = jest.fn(async () => [])
		mockPrismaRuntime({ ${spec.name}: { findMany } })

		await new List${spec.Plural}().run({ userId: USER_ID })
		expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: PAGE_DEFAULT_LIMIT + 1 }))
		await expect(new List${spec.Plural}().run({ userId: USER_ID, limit: 0 })).rejects.toBeInstanceOf(ValidationError)
	})
})

describe('Update${spec.Name}', () => {
	it('atualiza só do dono e devolve o item atualizado', async () => {
		const updateMany = jest.fn(async () => ({ count: 1 }))
		const findFirst = jest.fn(async () => record())
		mockPrismaRuntime({ ${spec.name}: { updateMany, findFirst } })

		await new Update${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: ITEM_ID, patch: { ${patchField.name}: ${patchValue} } })

		expect(updateMany).toHaveBeenCalledWith({
			where: { id: ITEM_ID, userId: USER_ID },
			data: { ${patchField.name}: ${patchValue} },
		})
	})

	it('recusa patch vazio e responde não encontrado quando nada foi atualizado', async () => {
		mockPrismaRuntime({ ${spec.name}: { updateMany: jest.fn(async () => ({ count: 0 })) } })

		await expect(
			new Update${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: ITEM_ID, patch: {} })
		).rejects.toBeInstanceOf(ValidationError)
		await expect(
			new Update${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: ITEM_ID, patch: { ${patchField.name}: ${patchValue} } })
		).rejects.toBeInstanceOf(NotFoundError)
	})
})

describe('Delete${spec.Name}', () => {
	it('apaga só do dono', async () => {
		const deleteMany = jest.fn(async () => ({ count: 1 }))
		mockPrismaRuntime({ ${spec.name}: { deleteMany } })

		await expect(new Delete${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: ITEM_ID })).resolves.toEqual({ ok: true })
		expect(deleteMany).toHaveBeenCalledWith({ where: { id: ITEM_ID, userId: USER_ID } })
	})

	it('responde não encontrado quando nada foi apagado', async () => {
		mockPrismaRuntime({ ${spec.name}: { deleteMany: jest.fn(async () => ({ count: 0 })) } })

		await expect(new Delete${spec.Name}().run({ userId: USER_ID, ${spec.name}Id: ITEM_ID })).rejects.toBeInstanceOf(NotFoundError)
	})
})
`
}

function schemaTest(spec) {
	const sample = spec.fields.map((field) => `\t\t${field.name}: ${field.sample},`).join('\n')
	return `import { create${spec.Name}BodySchema, update${spec.Name}BodySchema } from '@/schemas/${spec.name}.schema'

const VALID = {
${sample}
}

describe('${spec.name} schemas', () => {
	it('aceita um corpo válido', () => {
		expect(create${spec.Name}BodySchema.safeParse(VALID).success).toBe(true)
	})

	it('recusa campo desconhecido (userId, id…): evita mass assignment', () => {
		expect(create${spec.Name}BodySchema.safeParse({ ...VALID, userId: 'outro' }).success).toBe(false)
		expect(update${spec.Name}BodySchema.safeParse({ id: 'x' }).success).toBe(false)
	})

	it('o update aceita parcial e o create exige os campos obrigatórios', () => {
		expect(update${spec.Name}BodySchema.safeParse({}).success).toBe(true)
		expect(create${spec.Name}BodySchema.safeParse({}).success).toBe(${spec.fields.every((field) => field.optional)})
	})
})
`
}

function requestsFile(spec) {
	const bodyJson = JSON.stringify(
		Object.fromEntries(
			spec.fields.map((field) => [
				field.name,
				field.type === 'string'
					? 'Exemplo'
					: field.type === 'int'
						? 1
						: field.type === 'float'
							? 1.5
							: field.type === 'boolean'
								? true
								: '2026-10-26T12:00:00.000Z',
			])
		),
		null,
		2
	)
	return `@baseUrl = http://localhost:3000
@${spec.name}Id =

### List ${spec.plural} of the logged-in user (run the login request from auth.http first)
GET {{baseUrl}}/api/v1/${spec.route}?limit=20&order=desc

### Next page: paste pageInfo.nextCursor. \`q\` searches ${searchField(spec) ? searchField(spec).name : 'nothing (no string field)'}.
# GET {{baseUrl}}/api/v1/${spec.route}?cursor=<nextCursor>&q=exemplo

### Create
POST {{baseUrl}}/api/v1/${spec.route}
Content-Type: application/json
Origin: {{baseUrl}}

${bodyJson}

### Get
GET {{baseUrl}}/api/v1/${spec.route}/{{${spec.name}Id}}

### Update (partial)
PATCH {{baseUrl}}/api/v1/${spec.route}/{{${spec.name}Id}}
Content-Type: application/json
Origin: {{baseUrl}}

${JSON.stringify({ [spec.fields[0].name]: JSON.parse(bodyJson)[spec.fields[0].name] }, null, 2)}

### Delete
DELETE {{baseUrl}}/api/v1/${spec.route}/{{${spec.name}Id}}
Origin: {{baseUrl}}
`
}

/**
 * @param {ReturnType<typeof buildSpec>} spec
 * @returns {Array<{ path: string, content: string }>}
 */
function buildFiles(spec) {
	const { Name, Plural, name } = spec
	return [
		{ path: `prisma/models/${name}.prisma`, content: prismaModel(spec) },
		{ path: `src/schemas/${name}.schema.ts`, content: schemaFile(spec) },
		{ path: `src/repositories/${Name}.dto.ts`, content: dtoFile(spec) },
		{ path: `src/repositories/${Name}.repository.ts`, content: repositoryFile(spec) },
		{ path: `src/useCases/create${Name}.usecase.ts`, content: createUseCase(spec) },
		{ path: `src/useCases/get${Name}.usecase.ts`, content: getUseCase(spec) },
		{ path: `src/useCases/list${Plural}.usecase.ts`, content: listUseCase(spec) },
		{ path: `src/useCases/update${Name}.usecase.ts`, content: updateUseCase(spec) },
		{ path: `src/useCases/delete${Name}.usecase.ts`, content: deleteUseCase(spec) },
		{ path: `src/controllers/${Name}/${Name}.controller.ts`, content: controllerFile(spec) },
		{ path: `src/controllers/${Name}/routes/list.route.ts`, content: routeFile(spec, 'list') },
		{ path: `src/controllers/${Name}/routes/create.route.ts`, content: routeFile(spec, 'create') },
		{ path: `src/controllers/${Name}/routes/get.route.ts`, content: routeFile(spec, 'get') },
		{ path: `src/controllers/${Name}/routes/update.route.ts`, content: routeFile(spec, 'update') },
		{ path: `src/controllers/${Name}/routes/delete.route.ts`, content: routeFile(spec, 'delete') },
		{ path: `src/app/api/v1/${spec.route}/route.ts`, content: appCollectionRoute(spec) },
		{ path: `src/app/api/v1/${spec.route}/[id]/route.ts`, content: appItemRoute(spec) },
		{ path: `tests/useCases/${name}.usecases.test.ts`, content: testForUseCases(spec) },
		{ path: `tests/schemas/${name}.schema.test.ts`, content: schemaTest(spec) },
		{ path: `requests/${spec.route}/${spec.route}.http`, content: requestsFile(spec) },
	]
}

// ---------------------------------------------------------------------------------------------------------------------
// Patches em arquivos existentes (texto). Devolvem `null` quando a âncora não existe: o CLI avisa e segue.
// ---------------------------------------------------------------------------------------------------------------------

function patchDependencies(source, spec) {
	const { Name, Plural } = spec
	const useCases = [
		[`List${Plural}`, `list${Plural}UseCase`],
		[`Create${Name}`, `create${Name}UseCase`],
		[`Get${Name}`, `get${Name}UseCase`],
		[`Update${Name}`, `update${Name}UseCase`],
		[`Delete${Name}`, `delete${Name}UseCase`],
	]
	const fileOf = (className) => `${className.charAt(0).toLowerCase()}${className.slice(1)}`

	const importLines = useCases.map(([cls]) => `import ${cls} from '@/useCases/${fileOf(cls)}.usecase'`)
	const typeLines = useCases.map(([cls, prop]) => `\t${prop}: ${cls}`)
	const newLines = useCases.map(([cls, prop]) => `\tconst ${prop} = new ${cls}()`)
	const returnLines = useCases.map(([, prop]) => `\t\t${prop},`)

	const typeAnchor = '}\n\nlet cachedDependencies'
	const newAnchor = '\n\tcachedDependencies = {'
	const returnAnchor = '\t}\n\n\treturn cachedDependencies'
	if (![typeAnchor, newAnchor, returnAnchor].every((anchor) => source.includes(anchor))) return null

	// Fim da última declaração `import ... from '...'` (aceita import de várias linhas).
	const importStatements = [...source.matchAll(/^import[\s\S]*?from '[^']+'\r?\n/gm)]
	const lastImport = importStatements[importStatements.length - 1]
	if (!lastImport) return null
	const insertAt = lastImport.index + lastImport[0].length - 1
	let next = `${source.slice(0, insertAt)}\n${importLines.join('\n')}${source.slice(insertAt)}`
	next = next.replace(typeAnchor, `${typeLines.join('\n')}\n${typeAnchor}`)
	next = next.replace(newAnchor, `\n${newLines.join('\n')}\n${newAnchor}`)
	next = next.replace(returnAnchor, `${returnLines.join('\n')}\n${returnAnchor}`)
	return next
}

function openApiPaths(spec) {
	const { Name, Plural, route } = spec
	const tag = route
	const idParam = `                - name: id
                  in: path
                  required: true
                  schema: { type: string }`
	return `    /api/v1/${route}:
        get:
            tags: [${tag}]
            summary: Listar ${Plural} do usuário logado
            description: Paginação por cursor, mais recentes primeiro (20 por página, máx. 100). \`q\` busca por trecho${searchField(spec) ? ` de \`${searchField(spec).name}\`` : ''}.
            security:
                - SessionCookie: []
            parameters:
                - name: cursor
                  in: query
                  required: false
                  schema: { type: string, maxLength: 200 }
                - name: limit
                  in: query
                  required: false
                  schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
                - name: q
                  in: query
                  required: false
                  schema: { type: string, maxLength: 100 }
                - name: order
                  in: query
                  required: false
                  schema: { type: string, enum: [asc, desc], default: desc }
            responses:
                '200':
                    description: Página de ${Plural}
                    content:
                        application/json:
                            schema:
                                allOf:
                                    - $ref: '#/components/schemas/ApiSuccess'
                                    - type: object
                                      properties:
                                          data:
                                              type: object
                                              properties:
                                                  items:
                                                      type: array
                                                      items: { $ref: '#/components/schemas/${Name}' }
                                                  pageInfo:
                                                      type: object
                                                      properties:
                                                          nextCursor: { type: string, nullable: true }
                                                          hasNext: { type: boolean }
                                                          limit: { type: integer }
                '400':
                    $ref: '#/components/responses/ValidationError'
                '401':
                    $ref: '#/components/responses/Unauthorized'
        post:
            tags: [${tag}]
            summary: Criar ${Name}
            security:
                - SessionCookie: []
            requestBody:
                required: true
                content:
                    application/json:
                        schema: { $ref: '#/components/schemas/${Name}Input' }
            responses:
                '201':
                    description: ${Name} criado
                    content:
                        application/json:
                            schema:
                                allOf:
                                    - $ref: '#/components/schemas/ApiSuccess'
                                    - type: object
                                      properties:
                                          data:
                                              type: object
                                              properties:
                                                  item: { $ref: '#/components/schemas/${Name}' }
                '400':
                    $ref: '#/components/responses/ValidationError'
                '401':
                    $ref: '#/components/responses/Unauthorized'

    /api/v1/${route}/{id}:
        get:
            tags: [${tag}]
            summary: Buscar ${Name} do usuário logado
            security:
                - SessionCookie: []
            parameters:
${idParam}
            responses:
                '200':
                    description: ${Name} encontrado
                    content:
                        application/json:
                            schema:
                                allOf:
                                    - $ref: '#/components/schemas/ApiSuccess'
                                    - type: object
                                      properties:
                                          data:
                                              type: object
                                              properties:
                                                  item: { $ref: '#/components/schemas/${Name}' }
                '401':
                    $ref: '#/components/responses/Unauthorized'
                '404':
                    description: Não existe ou é de outro usuário
        patch:
            tags: [${tag}]
            summary: Atualizar ${Name} (parcial)
            security:
                - SessionCookie: []
            parameters:
${idParam}
            requestBody:
                required: true
                content:
                    application/json:
                        schema: { $ref: '#/components/schemas/${Name}Input' }
            responses:
                '200':
                    description: ${Name} atualizado
                    content:
                        application/json:
                            schema:
                                allOf:
                                    - $ref: '#/components/schemas/ApiSuccess'
                                    - type: object
                                      properties:
                                          data:
                                              type: object
                                              properties:
                                                  item: { $ref: '#/components/schemas/${Name}' }
                '400':
                    $ref: '#/components/responses/ValidationError'
                '401':
                    $ref: '#/components/responses/Unauthorized'
                '404':
                    description: Não existe ou é de outro usuário
        delete:
            tags: [${tag}]
            summary: Apagar ${Name}
            security:
                - SessionCookie: []
            parameters:
${idParam}
            responses:
                '200':
                    description: Apagado
                '401':
                    $ref: '#/components/responses/Unauthorized'
                '404':
                    description: Não existe ou é de outro usuário

`
}

function openApiType(field) {
	const base = {
		string: '{ type: string }',
		int: '{ type: integer }',
		float: '{ type: number }',
		boolean: '{ type: boolean }',
		date: '{ type: string, format: date-time }',
	}[field.type]
	return field.optional ? base.replace('}', ', nullable: true }') : base
}

function openApiSchemas(spec) {
	const props = spec.fields.map((field) => `                ${field.name}: ${openApiType(field)}`).join('\n')
	const required = spec.fields.filter((field) => !field.optional).map((field) => field.name)
	return `        ${spec.Name}:
            type: object
            properties:
                id: { type: string }
${props}
                createdAt: { type: string, format: date-time }
                updatedAt: { type: string, format: date-time }
        ${spec.Name}Input:
            type: object
            description: No PATCH todos os campos são opcionais. Campos desconhecidos são recusados (400).
            additionalProperties: false
${required.length > 0 ? `            required: [${required.join(', ')}]\n` : ''}            properties:
${props}
`
}

function patchOpenApi(source, spec) {
	const tagAnchor = '\n\npaths:\n'
	const pathsAnchor = '\ncomponents:\n'
	const schemaAnchor = '        ApiError:\n'
	if (![tagAnchor, pathsAnchor, schemaAnchor].every((anchor) => source.includes(anchor))) return null
	let next = source.replace(tagAnchor, `\n    - name: ${spec.route}\n\npaths:\n`)
	next = next.replace(pathsAnchor, `\n${openApiPaths(spec)}components:\n`)
	next = next.replace(schemaAnchor, `${openApiSchemas(spec)}${schemaAnchor}`)
	return next
}

/** Acrescenta linhas ao fim da primeira tabela que vem depois do `heading`. */
function appendTableRows(markdown, heading, rows) {
	const start = markdown.indexOf(heading)
	if (start < 0) return null
	const lines = markdown.slice(start).split('\n')
	let index = lines.findIndex((line) => line.startsWith('|'))
	if (index < 0) return null
	while (index < lines.length && lines[index].startsWith('|')) index += 1
	lines.splice(index, 0, ...rows)
	return markdown.slice(0, start) + lines.join('\n')
}

function patchRequestsReadme(source, spec) {
	const { Plural, route } = spec
	const withIndex = appendTableRows(source, '## Index', [
		`| [${route}/${route}.http](./${route}/${route}.http) | ${Plural}: list, create, get, update, delete |`,
	])
	if (withIndex === null) return null
	return appendTableRows(withIndex, '## Route inventory', [
		`| GET | \`/api/v1/${route}\` | Yes | \`v1/${route}/route.ts\` |`,
		`| POST | \`/api/v1/${route}\` | Yes | \`v1/${route}/route.ts\` |`,
		`| GET | \`/api/v1/${route}/[id]\` | Yes (owner) | \`v1/${route}/[id]/route.ts\` |`,
		`| PATCH | \`/api/v1/${route}/[id]\` | Yes (owner) | \`v1/${route}/[id]/route.ts\` |`,
		`| DELETE | \`/api/v1/${route}/[id]\` | Yes (owner) | \`v1/${route}/[id]/route.ts\` |`,
	])
}

/** Passos que o gerador não faz sozinho (exigem decisão). */
function manualChecklist(spec) {
	return [
		`Exportação LGPD: incluir ${spec.Name} em src/useCases/exportUserData.usecase.ts (use ${spec.Name}Repository.listAllByUser).`,
		`Exclusão definitiva: apagar ${spec.plural} da conta em scripts/cron/jobs/retention-purge.mjs e em docs/operators/retention.md (deleteAllByUser).`,
		`Atualizar CONTEXT-ENTITIES.md (model), CONTEXT-CODE.md (repository, use cases, controller) e a data do snapshot.`,
		`Rodar: npm run prisma:push (altera o banco; revise antes), npm run typecheck, npm test.`,
		`Se o dado for sensível ou volumoso: rate limit nas rotas de escrita e cota/retenção.`,
	]
}

module.exports = {
	buildSpec,
	buildFiles,
	patchDependencies,
	patchOpenApi,
	patchRequestsReadme,
	manualChecklist,
	pluralize,
	FIELD_TYPES,
}
