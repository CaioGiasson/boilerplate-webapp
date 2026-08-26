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
		const parsed = new URL(trimmed, 'https://vitraux.invalid')
		if (parsed.origin !== 'https://vitraux.invalid') {
			return fallback
		}
		return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback
	} catch {
		return fallback
	}
}
