import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AUDIT_ACTIONS } from '@/constants/audit'

function read(file: string): string {
	return readFileSync(resolve(__dirname, '../..', file), 'utf8')
}

/** Ações escritas à mão (scripts e use cases) precisam existir em `AUDIT_ACTIONS`: o filtro da API as recusa senão. */
describe('ações de auditoria usadas no código', () => {
	const scripts = [
		'scripts/change-user-role.mjs',
		'scripts/change-user-password.mjs',
		'scripts/toggle-feature-flag.mjs',
	]

	it.each(scripts)('%s usa uma ação conhecida de operador', (file) => {
		const actions = [...read(file).matchAll(/action: '([a-z_.]+)'/g)].map((match) => match[1])

		expect(actions.length).toBeGreaterThan(0)
		for (const action of actions) {
			expect(AUDIT_ACTIONS).toContain(action)
			expect(action.startsWith('operator.')).toBe(true)
		}
	})

	it('toda ação de use case registrada existe em AUDIT_ACTIONS', () => {
		const useCases = [
			'changeUserPassword',
			'resetPassword',
			'deleteUserAccount',
			'cancelAccountDeletion',
			'keepAccountDeletion',
			'confirmEmailChallenge',
			'revokeOtherUserSessions',
			'createImpersonationToken',
			'consumeImpersonationToken',
		]
		for (const name of useCases) {
			const actions = [...read(`src/useCases/${name}.usecase.ts`).matchAll(/action: '([a-z_.]+)'/g)].map(
				(match) => match[1]
			)
			expect(actions.length).toBeGreaterThan(0)
			for (const action of actions) expect(AUDIT_ACTIONS).toContain(action)
		}
	})

	it('toda ação do catálogo é usada em algum lugar (sem ação órfã)', () => {
		const sources = [
			...['change-user-role', 'change-user-password', 'toggle-feature-flag'].map((name) =>
				read(`scripts/${name}.mjs`)
			),
			...[
				'changeUserPassword',
				'resetPassword',
				'deleteUserAccount',
				'cancelAccountDeletion',
				'keepAccountDeletion',
				'confirmEmailChallenge',
				'revokeOtherUserSessions',
				'createImpersonationToken',
				'consumeImpersonationToken',
			].map((name) => read(`src/useCases/${name}.usecase.ts`)),
		].join('\n')

		const orphans = AUDIT_ACTIONS.filter((action) => !sources.includes(`'${action}'`))

		expect(orphans).toEqual([])
	})
})
