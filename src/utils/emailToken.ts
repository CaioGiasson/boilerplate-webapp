import { createHash, randomBytes } from 'node:crypto'
import { EMAIL_CODE_LENGTH, normalizeEmailToken } from '@/utils/emailCode'

export { EMAIL_CODE_LENGTH, normalizeEmailToken } from '@/utils/emailCode'

export const EMAIL_TOKEN_TTL_MS = 60 * 60 * 1000
const EMAIL_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export type EmailTokenPurpose = 'verify' | 'change_old' | 'change_new' | 'password_reset'

/**
 * Gera código de 6 caracteres alfanuméricos em caixa alta (fácil de digitar/colar).
 */
export function createEmailToken(): { token: string; hash: string } {
	const bytes = randomBytes(EMAIL_CODE_LENGTH)
	let token = ''
	for (let i = 0; i < EMAIL_CODE_LENGTH; i++) {
		token += EMAIL_CODE_ALPHABET[bytes[i]! % EMAIL_CODE_ALPHABET.length]
	}
	return { token, hash: hashEmailToken(token) }
}

export function hashEmailToken(token: string): string {
	return createHash('sha256').update(normalizeEmailToken(token)).digest('hex')
}

export function emailTokenExpiresAt(now = new Date()): Date {
	return new Date(now.getTime() + EMAIL_TOKEN_TTL_MS)
}
