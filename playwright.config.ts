import { defineConfig, devices } from '@playwright/test'
import { E2E_BASE_URL, E2E_PORT, E2E_TWO_FACTOR_KEY, e2eDatabaseUrl } from './e2e/support/env'

/**
 * E2E contra o app **construído** (`npm run build` antes) e um MongoDB só dos testes (banco `e2e`).
 * Guia: docs/operators/e2e.md.
 *
 *   npm run e2e:prepare   # cria as coleções no banco e2e (prisma db push)
 *   npm run e2e           # sobe o servidor e roda tudo
 *
 * Projetos: `api` (sem navegador, rápido) e `ui` (Chromium; `npx playwright install chromium`).
 */
export default defineConfig({
	testDir: './e2e',
	// Contas criadas pelos testes são únicas; um worker evita brigar por limite de requisições e pela porta.
	workers: 1,
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
	timeout: 30_000,
	expect: { timeout: 5_000 },
	use: {
		baseURL: E2E_BASE_URL,
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'api', testMatch: /api\/.*\.spec\.ts/ },
		{ name: 'ui', testMatch: /ui\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], locale: 'pt-BR' } },
	],
	webServer: {
		command: 'npm run start',
		url: `${E2E_BASE_URL}/api/ping`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			...(process.env as Record<string, string>),
			PORT: String(E2E_PORT),
			SERVER_PORT: String(E2E_PORT),
			DATABASE_URL: e2eDatabaseUrl(),
			ENVIRONMENT: 'dev',
			APP_BASE_URL: E2E_BASE_URL,
			TWO_FACTOR_ENCRYPTION_KEY: E2E_TWO_FACTOR_KEY,
			JOBS_WORKER: 'off',
			AI_PROVIDER: 'none',
			// `next start` é NODE_ENV=production, que recusa EMAIL_PROVIDER=none. O e-mail aponta para uma porta morta:
			// o envio falha rápido (o app trata falha de e-mail como "melhor esforço") e nada sai para a internet.
			EMAIL_PROVIDER: 'brevo',
			BREVO_API_KEY: 'e2e-not-a-real-key',
			BREVO_API_BASE_URL: 'http://127.0.0.1:9',
			EMAIL_FROM: 'e2e@example.test',
			EMAIL_TIMEOUT_MS: '1000',
			LOG_LEVEL: 'error',
		},
	},
})
