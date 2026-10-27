/**
 * Gera um CRUD de entidade do usuário em todas as camadas (model Prisma, repository, use cases, controller,
 * rotas, schema Zod, testes, contrato OpenAPI e requests) e liga os use cases em `src/container/dependencies.ts`.
 *
 * Uso:
 *   npm run gen:module -- <Nome> [--fields "title:string,done:boolean?,dueAt:date?"] [--plural Nomes] [--confirm]
 *
 * Tipos de campo: string, int, float, boolean, date. Sufixo `?` = opcional. Padrão: `name:string`.
 * Sem --confirm só mostra o plano (dry-run). Recusa sobrescrever arquivo existente e rodar em produção.
 * Não faz sozinho: exportação LGPD, exclusão de conta, CONTEXT*.md e `prisma:push` (a saída lista os passos).
 * Guia: docs/operators/gen-module.md
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { refuseIfProduction } from './lib/operator.mjs'

const require = createRequire(import.meta.url)
const {
	buildSpec,
	buildFiles,
	patchDependencies,
	patchOpenApi,
	patchRequestsReadme,
	manualChecklist,
} = require('./lib/genModule.cjs')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const USAGE = 'Usage: npm run gen:module -- <Name> [--fields "title:string,done:boolean?"] [--plural Names] [--confirm]'

function option(flag) {
	const index = process.argv.indexOf(flag)
	return index >= 0 ? process.argv[index + 1]?.trim() : undefined
}

function fail(message) {
	console.error(message)
	process.exit(1)
}

/** Deixa o código gerado no estilo do repositório (o hook de commit faria o mesmo). */
function formatGenerated(files, patches) {
	const targets = [...files.map((file) => file.path), ...patches.map((patch) => patch.path)].filter((path) =>
		/\.(ts|md|yaml)$/.test(path)
	)
	const prettier = resolve(root, 'node_modules/prettier/bin/prettier.cjs')
	const result = spawnSync(process.execPath, [prettier, '--write', ...targets], { cwd: root, stdio: 'ignore' })
	if (result.status !== 0) console.warn('  aviso: não consegui rodar o Prettier; rode npm run check.')
}

function main() {
	refuseIfProduction()

	const name = process.argv[2]
	if (!name || name.startsWith('--')) fail(USAGE)
	const confirm = process.argv.includes('--confirm')

	let spec
	try {
		spec = buildSpec({ name, fields: option('--fields'), plural: option('--plural') })
	} catch (error) {
		fail(`${error.message}\n${USAGE}`)
	}

	const abs = (file) => resolve(root, file)
	const files = buildFiles(spec)

	const modelsDir = abs('prisma/models')
	const modelClash = readdirSync(modelsDir).find((file) =>
		new RegExp(`^model ${spec.Name} `, 'm').test(readFileSync(resolve(modelsDir, file), 'utf8'))
	)
	if (modelClash) fail(`O model ${spec.Name} já existe em prisma/models/${modelClash}.`)

	const existing = files.filter((file) => existsSync(abs(file.path)))
	if (existing.length > 0) {
		fail(`Nada foi gerado: já existem\n${existing.map((file) => `  ${file.path}`).join('\n')}`)
	}

	const patches = [
		['src/container/dependencies.ts', patchDependencies],
		['docs/openapi.yaml', patchOpenApi],
		['requests/README.md', patchRequestsReadme],
	].map(([path, patch]) => ({ path, next: patch(readFileSync(abs(path), 'utf8'), spec) }))
	const broken = patches.filter((patch) => patch.next === null)
	if (broken.length > 0) {
		fail(
			`Nada foi gerado: não achei o ponto de inserção em\n${broken.map((patch) => `  ${patch.path}`).join('\n')}\n` +
				'O arquivo mudou de formato; ajuste scripts/lib/genModule.cjs.'
		)
	}

	console.log(`${confirm ? 'Gerando' : 'Dry-run:'} ${spec.Name} (rota /api/v1/${spec.route})`)
	for (const file of files) {
		console.log(`  ${confirm ? 'criado' : 'criaria'}: ${file.path}`)
		if (confirm) {
			mkdirSync(dirname(abs(file.path)), { recursive: true })
			writeFileSync(abs(file.path), file.content)
		}
	}
	for (const patch of patches) {
		console.log(`  ${confirm ? 'alterado' : 'alteraria'}: ${patch.path}`)
		if (confirm) writeFileSync(abs(patch.path), patch.next)
	}

	if (confirm) formatGenerated(files, patches)

	console.log('\nFalta fazer (decisão sua):')
	for (const item of manualChecklist(spec)) console.log(`  - ${item}`)
	if (!confirm) console.log('\nNada foi gravado. Rode de novo com --confirm para aplicar.')
	else console.log('\nDica: npm run prisma-merge && npx prisma generate para o client conhecer o novo model.')
}

main()
