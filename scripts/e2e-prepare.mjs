/**
 * Prepara o banco dos testes E2E (cria coleções e índices com `prisma db push`) e confere que ele é separado do de dev.
 *
 * Uso: npm run e2e:prepare
 *
 * Banco: `E2E_DATABASE_URL`, ou o `DATABASE_URL` do `.env` com o nome do banco trocado por `e2e` (mesma regra do
 * `playwright.config.ts`). Recusa rodar em produção. O `db push` altera o schema **desse** banco, nunca o de dev.
 */
import { config as loadEnv } from 'dotenv'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { refuseIfProduction } from './lib/operator.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
loadEnv({ path: resolve(root, '.env') })

function e2eDatabaseUrl() {
	if (process.env.E2E_DATABASE_URL?.trim()) return process.env.E2E_DATABASE_URL.trim()
	const base = process.env.DATABASE_URL?.trim()
	if (!base) {
		console.error('Defina E2E_DATABASE_URL (ou DATABASE_URL no .env).')
		process.exit(1)
	}
	const url = new URL(base)
	url.pathname = '/e2e'
	return url.toString()
}

refuseIfProduction()

const databaseUrl = e2eDatabaseUrl()
const devUrl = process.env.DATABASE_URL?.trim()
if (
	devUrl &&
	new URL(databaseUrl).pathname === new URL(devUrl).pathname &&
	new URL(databaseUrl).host === new URL(devUrl).host
) {
	console.error('O banco E2E é o mesmo do DATABASE_URL: use outro nome de banco (E2E_DATABASE_URL).')
	process.exit(1)
}

const run = (command, args, env = {}) =>
	spawnSync(command, args, {
		cwd: root,
		stdio: 'inherit',
		shell: process.platform === 'win32',
		env: { ...process.env, ...env },
	})

if (run('npm', ['run', 'prisma-merge']).status !== 0) process.exit(1)
const push = run('npx', ['prisma', 'db', 'push', '--skip-generate'], { DATABASE_URL: databaseUrl })
process.exit(push.status ?? 1)
