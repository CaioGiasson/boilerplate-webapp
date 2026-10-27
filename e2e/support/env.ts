import { randomBytes } from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(__dirname, '../../.env') })

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100)
/** `localhost`, não `127.0.0.1`: o `next start` monta `request.nextUrl.origin` com `localhost`, e a checagem de CSRF compara com o `Origin`. */
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

/**
 * Banco **separado** do de desenvolvimento: `E2E_DATABASE_URL`, ou o `DATABASE_URL` com o nome do banco trocado
 * por `e2e`. Os testes criam e apagam contas `e2e_*`; nunca aponte para um banco com dados que importam.
 */
export function e2eDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
	if (env.E2E_DATABASE_URL?.trim()) return env.E2E_DATABASE_URL.trim()
	const base = env.DATABASE_URL?.trim()
	if (!base) {
		throw new Error('Defina E2E_DATABASE_URL (ou DATABASE_URL no .env) para rodar os testes E2E.')
	}
	const url = new URL(base)
	url.pathname = '/e2e'
	return url.toString()
}

/** Chave 2FA só desta execução: o servidor dos testes e o teste não precisam compartilhá-la (o TOTP vem da API). */
export const E2E_TWO_FACTOR_KEY = randomBytes(32).toString('base64')
