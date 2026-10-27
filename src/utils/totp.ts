import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * TOTP (RFC 6238) com HMAC-SHA1, 6 dígitos e passo de 30 s: o que Google Authenticator, Authy, 1Password etc.
 * esperam. Implementado com `node:crypto` para não trazer dependência.
 */

export const TOTP_PERIOD_SECONDS = 30
export const TOTP_DIGITS = 6
/** Passos aceitos antes/depois do atual (±30 s) para tolerar relógio descalibrado. */
export const TOTP_WINDOW_STEPS = 1

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const SECRET_BYTES = 20
const RECOVERY_CODE_COUNT = 10
const RECOVERY_CODE_GROUP_LENGTH = 5

export function base32Encode(bytes: Uint8Array): string {
	let bits = 0
	let value = 0
	let output = ''
	for (const byte of bytes) {
		value = (value << 8) | byte
		bits += 8
		while (bits >= 5) {
			output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
			bits -= 5
		}
	}
	if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
	return output
}

/** `null` para entrada com caractere fora do alfabeto. Aceita minúsculas, espaços e `=`. */
export function base32Decode(input: string): Buffer | null {
	const cleaned = input.replace(/[\s=]/g, '').toUpperCase()
	let bits = 0
	let value = 0
	const bytes: number[] = []
	for (const char of cleaned) {
		const index = BASE32_ALPHABET.indexOf(char)
		if (index < 0) return null
		value = (value << 5) | index
		bits += 5
		if (bits >= 8) {
			bytes.push((value >>> (bits - 8)) & 255)
			bits -= 8
		}
	}
	return Buffer.from(bytes)
}

/** Segredo novo (160 bits) em base32, o formato que os apps de autenticação digitam/importam. */
export function generateTotpSecret(): string {
	return base32Encode(randomBytes(SECRET_BYTES))
}

function hotp(secret: Buffer, counter: number): string {
	const message = Buffer.alloc(8)
	message.writeBigUInt64BE(BigInt(counter))
	const digest = createHmac('sha1', secret).update(message).digest()
	const offset = digest[digest.length - 1] & 0x0f
	const binary =
		((digest[offset] & 0x7f) << 24) |
		((digest[offset + 1] & 0xff) << 16) |
		((digest[offset + 2] & 0xff) << 8) |
		(digest[offset + 3] & 0xff)
	return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

export function totpStep(nowMs: number = Date.now()): number {
	return Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS)
}

/** Código do passo `step`. `null` se o segredo não for base32 válido. */
export function totpCode(secretBase32: string, step: number): string | null {
	const secret = base32Decode(secretBase32)
	return secret && secret.length > 0 ? hotp(secret, step) : null
}

function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a)
	const right = Buffer.from(b)
	return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Confere o código em `±TOTP_WINDOW_STEPS` passos e devolve o passo que casou (`null` se nenhum). Quem chama
 * deve guardar o passo e recusar o mesmo passo (ou menor) depois: sem isso o código é reutilizável por 90 s.
 */
export function verifyTotp(secretBase32: string, code: string, nowMs: number = Date.now()): number | null {
	if (!/^\d{6}$/.test(code)) return null
	const secret = base32Decode(secretBase32)
	if (!secret || secret.length === 0) return null

	const current = totpStep(nowMs)
	let matched: number | null = null
	// Percorre todos os passos (sem sair no primeiro acerto) para o tempo não revelar qual casou.
	for (let step = current - TOTP_WINDOW_STEPS; step <= current + TOTP_WINDOW_STEPS; step += 1) {
		if (step >= 0 && safeEqual(hotp(secret, step), code) && matched === null) matched = step
	}
	return matched
}

/** URI `otpauth://` que os apps abrem direto (ou leem por QR). */
export function buildOtpauthUri(input: { secret: string; accountName: string; issuer: string }): string {
	const label = `${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.accountName)}`
	const query = new URLSearchParams({
		secret: input.secret,
		issuer: input.issuer,
		algorithm: 'SHA1',
		digits: String(TOTP_DIGITS),
		period: String(TOTP_PERIOD_SECONDS),
	})
	return `otpauth://totp/${label}?${query.toString()}`
}

/** `ABCDE-FGHIJ`: 50 bits de entropia por código, sem caracteres ambíguos além do alfabeto base32. */
export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
	return Array.from({ length: count }, () => {
		const raw = base32Encode(randomBytes(7)).slice(0, RECOVERY_CODE_GROUP_LENGTH * 2)
		return `${raw.slice(0, RECOVERY_CODE_GROUP_LENGTH)}-${raw.slice(RECOVERY_CODE_GROUP_LENGTH)}`
	})
}

/** Maiúsculas e sem hífen/espaço: o usuário pode digitar do jeito que quiser. */
export function normalizeRecoveryCode(input: string): string {
	return input.replace(/[\s-]/g, '').toUpperCase()
}

/** Aparência esperada de um código de recuperação (10 caracteres base32), para recusar lixo cedo. */
export function looksLikeRecoveryCode(input: string): boolean {
	return /^[A-Z2-7]{10}$/.test(normalizeRecoveryCode(input))
}

/** SHA-256 do código normalizado: o código tem entropia alta, então hash rápido basta (como o token de e-mail). */
export function hashRecoveryCode(input: string): string {
	return createHash('sha256').update(normalizeRecoveryCode(input)).digest('hex')
}
