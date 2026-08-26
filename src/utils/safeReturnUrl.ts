import { APP_INVALID_ORIGIN } from '@/constants/app'

/**
 * Allows only same-origin relative paths for post-OAuth redirects.
 * Rejects protocol-relative (`//`), absolute URLs, and empty/whitespace.
 */
export function safeReturnUrl(raw: string | null | undefined, fallback = '/'): string {
	if (raw == null) {
		return fallback
	}
	const trimmed = raw.trim()
	if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
		return fallback
	}
	if (trimmed.includes('\\') || /[\0-\x1f]/.test(trimmed)) {
		return fallback
	}
	try {
		const parsed = new URL(trimmed, APP_INVALID_ORIGIN)
		if (parsed.origin !== APP_INVALID_ORIGIN) {
			return fallback
		}
		return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback
	} catch {
		return fallback
	}
}
