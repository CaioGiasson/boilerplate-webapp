import { NextRequest } from 'next/server'
import { ForbiddenError } from '@/errors'

function headerOrigin(request: NextRequest): string | null {
	const origin = request.headers.get('origin')?.trim()
	if (origin) {
		return origin
	}

	const referer = request.headers.get('referer')?.trim()
	if (!referer) {
		return null
	}

	try {
		return new URL(referer).origin
	} catch {
		return null
	}
}

/**
 * Blocks cross-site login CSRF (top-level POST that would Set-Cookie).
 * Production requires Origin or Referer. Local HTTP may omit Origin.
 */
export function assertSameOrigin(request: NextRequest): void {
	const expected = request.nextUrl.origin
	const actual = headerOrigin(request)

	if (!actual) {
		if (process.env.NODE_ENV === 'production') {
			throw new ForbiddenError('Invalid origin')
		}
		return
	}

	if (actual !== expected) {
		throw new ForbiddenError('Invalid origin')
	}
}
