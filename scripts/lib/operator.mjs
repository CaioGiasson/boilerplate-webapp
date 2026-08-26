/**
 * Operator CLI helpers. Keep in sync with `src/utils/maskEmail.ts` and `src/utils/isProductionEnv.ts`.
 */

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function isProductionEnv(env = process.env) {
	const nodeEnv = env.NODE_ENV?.trim().toLowerCase()
	const environment = env.ENVIRONMENT?.trim().toLowerCase()

	return nodeEnv === 'production' || environment === 'prod' || environment === 'production'
}

/**
 * @param {string} email
 */
export function maskEmail(email) {
	const trimmed = email.trim()
	const at = trimmed.indexOf('@')

	if (at <= 0) {
		if (trimmed.length === 0) {
			return '***'
		}
		const first = trimmed[0] ?? '*'
		return `${first}***`
	}

	const local = trimmed.slice(0, at)
	const domain = trimmed.slice(at + 1)
	const localFirst = local[0] ?? '*'
	const labels = domain.split('.').filter(Boolean)
	const tld = labels.at(-1) || 'invalid'
	const domainFirst = labels[0]?.[0] ?? '*'

	return `${localFirst}***@${domainFirst}***.${tld}`
}

export function refuseIfProduction() {
	if (!isProductionEnv()) {
		return
	}

	console.error(
		'Este script é uma ferramenta de operador local e não pode rodar em produção (NODE_ENV=production ou ENVIRONMENT=prod).'
	)
	process.exit(1)
}
