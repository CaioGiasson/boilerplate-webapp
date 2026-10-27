import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'

const {
	buildSpec,
	buildFiles,
	patchDependencies,
	patchOpenApi,
	patchRequestsReadme,
	pluralize,
} = require('../../scripts/lib/genModule.cjs')

const FIELDS = 'title:string,done:boolean?,priority:int,ratio:float,dueAt:date?'

function read(file: string): string {
	return readFileSync(resolve(__dirname, '../..', file), 'utf8')
}

describe('buildSpec', () => {
	it('deriva nomes, plural e rota', () => {
		expect(buildSpec({ name: 'Task' })).toMatchObject({
			Name: 'Task',
			name: 'task',
			Plural: 'Tasks',
			plural: 'tasks',
			route: 'tasks',
		})
		expect(buildSpec({ name: 'ProjectItem' })).toMatchObject({
			name: 'projectItem',
			Plural: 'ProjectItems',
			route: 'project-items',
		})
		expect(buildSpec({ name: 'Task', plural: 'Chores' }).route).toBe('chores')
	})

	it.each([
		['Category', 'Categories'],
		['Box', 'Boxes'],
		['Day', 'Days'],
		['Class', 'Classes'],
	])('pluraliza %s → %s', (singular, plural) => {
		expect(pluralize(singular)).toBe(plural)
	})

	it('lê campos com tipo e opcional; o padrão é name:string', () => {
		expect(buildSpec({ name: 'Task' }).fields).toMatchObject([{ name: 'name', type: 'string', optional: false }])
		expect(
			buildSpec({ name: 'Task', fields: FIELDS }).fields.map((f: { name: string; optional: boolean }) => [
				f.name,
				f.optional,
			])
		).toEqual([
			['title', false],
			['done', true],
			['priority', false],
			['ratio', false],
			['dueAt', true],
		])
	})

	it.each([
		[{ name: 'task' }, /PascalCase/],
		[{ name: 'Task Item' }, /PascalCase/],
		[{ name: 'Task', fields: 'title' }, /Campo inválido/],
		[{ name: 'Task', fields: 'title:text' }, /Tipo "text" inválido/],
		[{ name: 'Task', fields: 'userId:string' }, /reservado/],
		[{ name: 'Task', fields: 'a:int,a:string' }, /repetido/],
		[{ name: 'Task', fields: ',' }, /vazio/],
		[{ name: 'Sheep', plural: 'Sheep' }, /plural/],
	])('recusa entrada inválida %j', (input, message) => {
		expect(() => buildSpec(input)).toThrow(message)
	})
})

describe('buildFiles', () => {
	const spec = buildSpec({ name: 'Task', fields: FIELDS })
	const files = buildFiles(spec) as Array<{ path: string; content: string }>
	const byPath = (path: string) => files.find((file) => file.path === path)?.content ?? ''

	it('gera todas as camadas', () => {
		expect(files.map((file) => file.path)).toEqual([
			'prisma/models/task.prisma',
			'src/schemas/task.schema.ts',
			'src/repositories/Task.dto.ts',
			'src/repositories/Task.repository.ts',
			'src/useCases/createTask.usecase.ts',
			'src/useCases/getTask.usecase.ts',
			'src/useCases/listTasks.usecase.ts',
			'src/useCases/updateTask.usecase.ts',
			'src/useCases/deleteTask.usecase.ts',
			'src/controllers/Task/Task.controller.ts',
			'src/controllers/Task/routes/list.route.ts',
			'src/controllers/Task/routes/create.route.ts',
			'src/controllers/Task/routes/get.route.ts',
			'src/controllers/Task/routes/update.route.ts',
			'src/controllers/Task/routes/delete.route.ts',
			'src/app/api/v1/tasks/route.ts',
			'src/app/api/v1/tasks/[id]/route.ts',
			'tests/useCases/task.usecases.test.ts',
			'tests/schemas/task.schema.test.ts',
			'requests/tasks/tasks.http',
		])
	})

	it('model Prisma com campos opcionais, userId e índice por dono', () => {
		const model = byPath('prisma/models/task.prisma')

		expect(model).toContain('model Task {')
		expect(model).toMatch(/done\s+Boolean\?/)
		expect(model).toMatch(/priority\s+Int\n/)
		expect(model).toMatch(/dueAt\s+DateTime\?/)
		expect(model).toContain('@@index([userId, createdAt])')
	})

	it('schema é strict e valida por tipo', () => {
		const schema = byPath('src/schemas/task.schema.ts')

		expect(schema).toContain('.strict()')
		expect(schema).toContain('title: z.string().trim().min(1).max(200),')
		expect(schema).toContain('done: z.boolean().nullish(),')
		expect(schema).toContain('dueAt: z.coerce.date().nullish(),')
	})

	it('repository filtra tudo por userId, busca pelo primeiro campo string e expõe export/purge', () => {
		const repository = byPath('src/repositories/Task.repository.ts')

		expect(repository).toContain('where: { id, userId }')
		expect(repository).toContain("title: { contains: input.q, mode: 'insensitive' as const }")
		expect(repository).toContain('listAllByUser')
		expect(repository).toContain('deleteAllByUser')
	})

	it('o DTO não expõe userId e converte datas', () => {
		const dto = byPath('src/repositories/Task.dto.ts')

		expect(dto.split('export type TaskDto')[1]).not.toContain('userId')
		expect(dto).toContain('dueAt: record.dueAt ? record.dueAt.toISOString() : null,')
	})

	it('rotas de escrita exigem same-origin e a de lista usa parsePageQuery', () => {
		expect(byPath('src/controllers/Task/routes/create.route.ts')).toContain('assertSameOrigin(request)')
		expect(byPath('src/controllers/Task/routes/delete.route.ts')).toContain('assertSameOrigin(request)')
		expect(byPath('src/controllers/Task/routes/list.route.ts')).toContain('parsePageQuery')
	})

	it('sem campo string, a busca q não gera cláusula', () => {
		const noString = buildFiles(buildSpec({ name: 'Counter', fields: 'value:int' })) as typeof files
		const repository =
			noString.find((file) => file.path === 'src/repositories/Counter.repository.ts')?.content ?? ''

		expect(repository).not.toContain('contains')
	})

	it.each(
		(buildFiles(buildSpec({ name: 'Task', fields: FIELDS })) as Array<{ path: string; content: string }>)
			.filter((file) => file.path.endsWith('.ts'))
			.map((file) => [file.path, file.content])
	)('%s é TypeScript sintaticamente válido', (_path, content) => {
		const result = ts.transpileModule(content, {
			reportDiagnostics: true,
			compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
		})

		expect(result.diagnostics?.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([])
	})
})

describe('patches contra os arquivos reais do repositório', () => {
	const spec = buildSpec({ name: 'Task', fields: FIELDS })

	it('dependencies.ts: importa, tipa, instancia e retorna os 5 use cases', () => {
		const next = patchDependencies(read('src/container/dependencies.ts'), spec) as string

		expect(next).toContain("import ListTasks from '@/useCases/listTasks.usecase'")
		expect(next).toContain('\tlistTasksUseCase: ListTasks\n')
		expect(next).toContain('const deleteTaskUseCase = new DeleteTask()')
		expect(next).toContain('\t\tcreateTaskUseCase,\n')
		for (const use of ['listTasks', 'createTask', 'getTask', 'updateTask', 'deleteTask']) {
			expect(next.match(new RegExp(`${use}UseCase`, 'g'))).toHaveLength(3)
		}
	})

	it('dependencies.ts: dois módulos seguidos não colidem', () => {
		const once = patchDependencies(read('src/container/dependencies.ts'), spec) as string
		const twice = patchDependencies(once, buildSpec({ name: 'Note' })) as string

		expect(twice).toContain('listNotesUseCase')
		expect(twice).toContain('listTasksUseCase')
	})

	it('openapi.yaml: tag, caminhos e schemas', () => {
		const next = patchOpenApi(read('docs/openapi.yaml'), spec) as string

		expect(next).toContain('    - name: tasks\n')
		expect(next).toContain('    /api/v1/tasks:\n')
		expect(next).toContain('    /api/v1/tasks/{id}:\n')
		expect(next).toContain('        TaskInput:\n')
		expect(next).toContain('required: [title, priority, ratio]')
	})

	it('requests/README.md: índice e inventário', () => {
		const next = patchRequestsReadme(read('requests/README.md'), spec) as string

		expect(next).toContain('[tasks/tasks.http](./tasks/tasks.http)')
		expect(next).toContain('| DELETE | `/api/v1/tasks/[id]` |')
	})

	it('devolvem null quando a âncora não existe (o CLI aborta sem gravar nada)', () => {
		expect(patchDependencies('export const x = 1', spec)).toBeNull()
		expect(patchOpenApi('openapi: 3.0.3', spec)).toBeNull()
		expect(patchRequestsReadme('# sem tabelas', spec)).toBeNull()
	})
})
