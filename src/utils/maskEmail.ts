/**
 * Masks an email for operator CLI stdout (PRIV-I10).
 * Keeps the first local character and a truncated domain: `alice@example.com` → `a***@e***.com`.
 */
export function maskEmail(email: string): string {
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
