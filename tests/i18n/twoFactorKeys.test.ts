import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { messagesByLocale } from '@/constants/texts'

function lookup(root: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], root)
}

/** Mesma ideia de `adminKeys.test.ts`: `t('chave')` sem catálogo só quebra em runtime. */
const FILES: Array<{ file: string; namespace: 'auth' | 'profile' }> = [
	{ file: 'src/components/auth/LoginForm.tsx', namespace: 'auth' },
	{ file: 'src/components/auth/ProfileTwoFactorSection.tsx', namespace: 'profile' },
]

describe('chaves de i18n do 2FA', () => {
	it.each(FILES)('$file: todas as chaves literais existem em pt, en e es', ({ file, namespace }) => {
		const code = readFileSync(resolve(__dirname, '../..', file), 'utf8')
		const keys = new Set([...code.matchAll(/\bt\('([A-Za-z.]+)'/g)].map((match) => match[1]))

		expect(keys.size).toBeGreaterThan(5)
		for (const locale of ['pt', 'en', 'es'] as const) {
			const missing = [...keys].filter(
				(key) => typeof lookup(messagesByLocale[locale][namespace], key) !== 'string'
			)
			expect(missing).toEqual([])
		}
	})
})
