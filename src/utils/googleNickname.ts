import { randomBytes } from 'node:crypto'
import { NICKNAME_MAX_LENGTH, canonicalizeNickname } from '@/utils/nickname'

const ALLOWED_CHAR = /[\p{Script=Latin}\p{Nd}_-]/u
const SUFFIX_LENGTH = 8
/** `_` + 8 random letters — reserved when base is taken. */
const COLLISION_RESERVE = 1 + SUFFIX_LENGTH

/**
 * Derives a nickname candidate from an email local-part:
 * - canonicalize (NFC, lowercase, strip invisibles)
 * - replace chars outside Latin/digit/_/- with `_`
 * - truncate to {@link NICKNAME_MAX_LENGTH}
 * - if empty after sanitize, use `user`
 */
export function nicknameBaseFromEmail(email: string): string {
	const at = email.indexOf('@')
	const local = at >= 0 ? email.slice(0, at) : email
	const canonical = canonicalizeNickname(local)
	let out = ''
	for (const char of canonical) {
		out += ALLOWED_CHAR.test(char) ? char : '_'
	}
	out = out.replace(/_+/g, '_').replace(/^_|_$/g, '')
	if (!out) {
		out = 'user'
	}
	if (out.length > NICKNAME_MAX_LENGTH) {
		out = out.slice(0, NICKNAME_MAX_LENGTH)
	}
	return out
}

function randomLetterSuffix(length: number = SUFFIX_LENGTH): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz'
	const bytes = randomBytes(length)
	let result = ''
	for (let i = 0; i < length; i++) {
		result += alphabet[bytes[i]! % alphabet.length]
	}
	return result
}

/**
 * Builds a unique nickname for Google signup.
 * First try: sanitized local-part. On collision: truncate to leave room for `_` + 8 letters, retry.
 */
export async function allocateGoogleNickname(
	email: string,
	isTaken: (nickname: string) => Promise<boolean>
): Promise<string> {
	const base = nicknameBaseFromEmail(email)
	if (!(await isTaken(base))) {
		return base
	}

	const prefixMax = Math.max(1, NICKNAME_MAX_LENGTH - COLLISION_RESERVE)
	const prefix = base.slice(0, prefixMax)

	for (let attempt = 0; attempt < 64; attempt++) {
		const candidate = `${prefix}_${randomLetterSuffix()}`
		if (!(await isTaken(candidate))) {
			return candidate
		}
	}

	throw new Error('Could not allocate a unique nickname')
}
