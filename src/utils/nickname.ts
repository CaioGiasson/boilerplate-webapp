import { ValidationError } from '@/errors'

/** Invisible / format chars stripped before canonicalize (ZWSP, ZWNJ, ZWJ, WJ, BOM, soft hyphen). */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g

/** Latin letters, decimal digits, underscore, hyphen — rejects Cyrillic lookalikes without a UTS #39 table. */
const ALLOWED_NICKNAME = /^[\p{Script=Latin}\p{Nd}_-]+$/u

export const NICKNAME_MAX_LENGTH = 32

/**
 * NFC + strip invisibles + lowercase (en-US, locale-independent for Turkish İ).
 * For lookup only — does not validate charset.
 */
export function canonicalizeNickname(raw: string): string {
	return raw.trim().normalize('NFC').replace(INVISIBLE_CHARS, '').toLocaleLowerCase('en-US')
}

/**
 * Canonical form for persistence. Rejects empty, controls, NFKC-divergent forms,
 * non-Latin scripts (homograph mitigation without UTS #39), and overlong values.
 *
 * Choice: store **NFC** (not NFKC). If NFKC(nick) !== NFC(nick), reject — catches
 * fullwidth / compatibility confusables without a dependency.
 */
export function normalizeNickname(raw: string): string {
	const trimmed = raw.trim()
	if (!trimmed) {
		throw new ValidationError('Nickname is required')
	}

	const canonical = canonicalizeNickname(trimmed)
	if (!canonical) {
		throw new ValidationError('Invalid nickname')
	}

	if (canonical.length > NICKNAME_MAX_LENGTH) {
		throw new ValidationError('Invalid nickname')
	}

	if (/[\p{Cc}\p{Cf}]/u.test(canonical)) {
		throw new ValidationError('Invalid nickname')
	}

	const nfkc = canonical.normalize('NFKC')
	if (nfkc !== canonical) {
		throw new ValidationError('Invalid nickname')
	}

	if (!ALLOWED_NICKNAME.test(canonical)) {
		throw new ValidationError('Invalid nickname')
	}

	return canonical
}
