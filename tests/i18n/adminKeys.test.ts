import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AUDIT_ACTIONS } from '@/constants/audit'
import { messagesByLocale } from '@/constants/texts'

const ADMIN_DIR = resolve(__dirname, '../../src/components/admin')

function lookup(root: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], root)
}

/**
 * `useTranslations` não é tipado por chave: um `t('x')` sem catálogo só quebra em runtime. Este teste lê as
 * chaves literais usadas em `src/components/admin/*` e exige que existam em pt, en e es.
 */
describe('chaves de i18n do painel admin', () => {
	const sources = readdirSync(ADMIN_DIR)
		.filter((file) => file.endsWith('.tsx'))
		.map((file) => ({ file, code: readFileSync(resolve(ADMIN_DIR, file), 'utf8') }))

	const keys = new Set<string>()
	for (const { code } of sources) {
		for (const match of code.matchAll(/\bt\('([A-Za-z.]+)'/g)) keys.add(match[1])
	}

	it('encontra chaves para validar', () => {
		expect(keys.size).toBeGreaterThan(20)
	})

	it.each(['pt', 'en', 'es'] as const)('todas as chaves literais existem em %s', (locale) => {
		const admin = messagesByLocale[locale].admin
		const missing = [...keys].filter((key) => typeof lookup(admin, key) !== 'string')

		expect(missing).toEqual([])
	})

	it.each(['pt', 'en', 'es'] as const)('toda ação de auditoria tem rótulo em %s', (locale) => {
		const labels = messagesByLocale[locale].admin.auditActions as Record<string, string>
		const missing = AUDIT_ACTIONS.filter((action) => !labels[action.split('.').join('_')])

		expect(missing).toEqual([])
	})
})
