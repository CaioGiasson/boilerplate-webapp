import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export type SwaggerAccessRequest = {
	headers: Headers
}

export type SwaggerConfig = {
	enabled: boolean
	user: string
	password: string
}

function timingSafeStringEqual(expected: string, provided: string): boolean {
	const expectedDigest = createHash('sha256').update(expected).digest()
	const providedDigest = createHash('sha256').update(provided).digest()
	return timingSafeEqual(expectedDigest, providedDigest)
}

/**
 * Swagger is opt-in. When enabled, Basic auth (SWAGGER_USER / SWAGGER_PASSWORD) is required.
 * Misconfiguration (enabled without credentials) is treated as disabled → 404.
 */
export function getSwaggerConfig(env: NodeJS.ProcessEnv = process.env): SwaggerConfig {
	const enabled = env.SWAGGER_ENABLED?.trim().toLowerCase() === 'true'
	const user = env.SWAGGER_USER?.trim() ?? ''
	const password = env.SWAGGER_PASSWORD?.trim() ?? ''
	return { enabled, user, password }
}

export function isSwaggerConfigured(config: SwaggerConfig = getSwaggerConfig()): boolean {
	return config.enabled && config.user.length > 0 && config.password.length > 0
}

function parseBasicAuth(authorization: string | null): { user: string; password: string } | null {
	if (!authorization) {
		return null
	}
	const match = /^Basic\s+(.+)$/i.exec(authorization.trim())
	if (!match?.[1]) {
		return null
	}
	try {
		const decoded = Buffer.from(match[1], 'base64').toString('utf8')
		const sep = decoded.indexOf(':')
		if (sep < 0) {
			return null
		}
		return {
			user: decoded.slice(0, sep),
			password: decoded.slice(sep + 1),
		}
	} catch {
		return null
	}
}

export function isAllowedSwaggerRequest(
	request: SwaggerAccessRequest,
	config: SwaggerConfig = getSwaggerConfig()
): boolean {
	if (!isSwaggerConfigured(config)) {
		return false
	}

	const credentials = parseBasicAuth(request.headers.get('authorization'))
	if (!credentials) {
		return false
	}

	return (
		timingSafeStringEqual(config.user, credentials.user) &&
		timingSafeStringEqual(config.password, credentials.password)
	)
}

export function swaggerUnauthorizedResponse(): NextResponse {
	return new NextResponse('Authentication required', {
		status: 401,
		headers: {
			'WWW-Authenticate': 'Basic realm="Vitraux API Docs", charset="UTF-8"',
			'Cache-Control': 'no-store',
		},
	})
}

export function swaggerNotFoundResponse(): NextResponse {
	return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Gate for /api/docs*:
 * - not configured → 404 (hide existence)
 * - configured but bad/missing auth → 401 with WWW-Authenticate
 * - ok → null (caller continues)
 */
export function swaggerGateResponse(request: SwaggerAccessRequest): NextResponse | null {
	const config = getSwaggerConfig()
	if (!isSwaggerConfigured(config)) {
		return swaggerNotFoundResponse()
	}
	if (!isAllowedSwaggerRequest(request, config)) {
		return swaggerUnauthorizedResponse()
	}
	return null
}
