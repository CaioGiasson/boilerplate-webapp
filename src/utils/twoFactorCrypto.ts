import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Cifra o segredo TOTP em repouso (AES-256-GCM). O segredo precisa ser recuperável para validar códigos, então
 * hash não serve: quem lê o banco sem a chave (`TWO_FACTOR_ENCRYPTION_KEY`, fora do banco) não consegue gerar códigos.
 * Formato: `v1.<iv>.<tag>.<texto cifrado>` (base64url).
 */

const VERSION = 'v1'
const KEY_BYTES = 32
const IV_BYTES = 12

export const TWO_FACTOR_KEY_ERROR =
	'TWO_FACTOR_ENCRYPTION_KEY must be 32 bytes encoded as base64 (generate: npm run two-factor:key)'

/** Chave de 32 bytes a partir do base64 da env; `null` se ausente ou com tamanho errado. */
export function parseTwoFactorKey(raw: string | undefined): Buffer | null {
	if (!raw?.trim()) return null
	const key = Buffer.from(raw.trim(), 'base64')
	return key.length === KEY_BYTES ? key : null
}

export function encryptSecret(plain: string, key: Buffer): string {
	const iv = randomBytes(IV_BYTES)
	const cipher = createCipheriv('aes-256-gcm', key, iv)
	const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
	return [
		VERSION,
		iv.toString('base64url'),
		cipher.getAuthTag().toString('base64url'),
		encrypted.toString('base64url'),
	].join('.')
}

/** `null` quando o formato, a chave ou a integridade não conferem (nunca lança com dado vindo do banco). */
export function decryptSecret(blob: string, key: Buffer): string | null {
	const [version, iv, tag, encrypted, ...rest] = blob.split('.')
	if (version !== VERSION || !iv || !tag || !encrypted || rest.length > 0) return null
	try {
		const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
		decipher.setAuthTag(Buffer.from(tag, 'base64url'))
		return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
	} catch {
		return null
	}
}
