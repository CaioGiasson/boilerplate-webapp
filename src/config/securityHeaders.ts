export type SecurityHeader = {
	key: string
	value: string
}

export type SecurityHeaderEnv = {
	nodeEnv?: string
	spacesEndpoint?: string
	spacesBucket?: string
	spacesPublicBaseUrl?: string
}

const PERMISSIONS_POLICY = [
	'accelerometer=()',
	'camera=()',
	'geolocation=()',
	'gyroscope=()',
	'magnetometer=()',
	'microphone=()',
	'payment=()',
	'usb=()',
	'browsing-topics=()',
].join(', ')

function uniqueOrigins(origins: string[]): string[] {
	return [...new Set(origins.filter(Boolean))]
}

function originFromUrl(value: string): string | null {
	try {
		const origin = new URL(value).origin
		return origin.startsWith('https://') || origin.startsWith('http://') ? origin : null
	} catch {
		return null
	}
}

/**
 * Hosts used for public object URLs (`https://{bucket}.{endpoint}` and the optional CDN/custom base).
 * `*.digitaloceanspaces.com` covers one extra label; regional hosts need `{bucket}.{region}.digitaloceanspaces.com`.
 */
export function spacesImageSrcOrigins(env: SecurityHeaderEnv = {}): string[] {
	const endpoint = (env.spacesEndpoint ?? process.env.SPACES_ENDPOINT ?? '').trim()
	const bucket = (env.spacesBucket ?? process.env.SPACES_BUCKET ?? '').trim()
	const publicBase = (env.spacesPublicBaseUrl ?? process.env.SPACES_PUBLIC_BASE_URL ?? '').trim()

	const origins: string[] = ['https://*.digitaloceanspaces.com']

	if (endpoint) {
		origins.push(`https://${endpoint}`)
		origins.push(`https://*.${endpoint}`)
		if (bucket) {
			origins.push(`https://${bucket}.${endpoint}`)
		}
	}

	if (publicBase) {
		const origin = originFromUrl(publicBase)
		if (origin) {
			origins.push(origin)
		}
	}

	return uniqueOrigins(origins)
}

export function buildContentSecurityPolicyReportOnly(env: SecurityHeaderEnv = {}): string {
	const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV
	const isDev = nodeEnv === 'development'
	const imgSrc = ["'self'", 'data:', 'blob:', ...spacesImageSrcOrigins(env)].join(' ')
	const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'"
	const connectSrc = isDev ? "'self' ws: wss:" : "'self'"

	return [
		"default-src 'self'",
		`script-src ${scriptSrc}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src ${imgSrc}`,
		"font-src 'self' data:",
		`connect-src ${connectSrc}`,
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		"worker-src 'self' blob:",
	].join('; ')
}

export function buildEnforcedContentSecurityPolicy(): string {
	return "frame-ancestors 'none'"
}

export function buildSecurityHeaders(env: SecurityHeaderEnv = {}): SecurityHeader[] {
	const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV
	const headers: SecurityHeader[] = [
		{ key: 'X-Content-Type-Options', value: 'nosniff' },
		{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
		{ key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
		{ key: 'X-Frame-Options', value: 'DENY' },
		{ key: 'Content-Security-Policy', value: buildEnforcedContentSecurityPolicy() },
		{ key: 'Content-Security-Policy-Report-Only', value: buildContentSecurityPolicyReportOnly(env) },
	]

	if (nodeEnv !== 'development') {
		headers.unshift({
			key: 'Strict-Transport-Security',
			value: 'max-age=31536000; includeSubDomains',
		})
	}

	return headers
}
