export const EMAIL_CODE_LENGTH = 8

/**
 * Normaliza código de e-mail: maiúsculas, só A–Z / 0–9, no máximo EMAIL_CODE_LENGTH chars.
 * Seguro para uso no cliente (sem Node crypto).
 */
export function normalizeEmailToken(token: string): string {
	return token
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, EMAIL_CODE_LENGTH)
}
