import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

const FORWARDING_HEADERS = [
	'x-forwarded-for',
	'x-real-ip',
	'cf-connecting-ip',
	'do-connecting-ip',
	'forwarded',
] as const

export type HealthAccessRequest = {
	headers: Headers
	ip?: string | null
	nextUrl?: { searchParams: URLSearchParams }
}

export function normalizeIp(ip: string): string {
	let value = ip.trim().toLowerCase()

	if (value.startsWith('[') && value.includes(']')) {
		const closing = value.indexOf(']')
		value = value.slice(1, closing)
	} else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value)) {
		value = value.slice(0, value.lastIndexOf(':'))
	}

	if (value.startsWith('::ffff:')) {
		value = value.slice('::ffff:'.length)
	}

	return value
}

export function isLoopbackIp(ip: string): boolean {
	const normalized = normalizeIp(ip)
	return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost'
}

export function hasForwardingHeaders(headers: Headers): boolean {
	return FORWARDING_HEADERS.some((name) => {
		const value = headers.get(name)
		return value !== null && value.trim() !== ''
	})
}

function getConfiguredHealthToken(): string | null {
	const token = process.env.HEALTHCHECK_TOKEN?.trim() || process.env.HEALTH_TOKEN?.trim()
	return token || null
}

function readProvidedToken(request: HealthAccessRequest): string | null {
	const header = request.headers.get('x-healthcheck-token')?.trim()
	if (header) {
		return header
	}

	const authorization = request.headers.get('authorization')
	if (authorization) {
		const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
		const bearer = match?.[1]?.trim()
		if (bearer) {
			return bearer
		}
	}

	return null
}

function timingSafeTokenEqual(expected: string, provided: string): boolean {
	const expectedDigest = createHash('sha256').update(expected).digest()
	const providedDigest = createHash('sha256').update(provided).digest()
	return timingSafeEqual(expectedDigest, providedDigest)
}

export function getDirectPeerIp(request: HealthAccessRequest): string | null {
	const ip = request.ip?.trim()
	if (ip) {
		return ip
	}

	return null
}

function hostLooksLoopback(headers: Headers): boolean {
	const host = headers.get('host')?.trim()
	if (!host) {
		return false
	}

	const hostname = host.startsWith('[') ? host.slice(1, host.indexOf(']')) : host.split(':')[0]
	return isLoopbackIp(hostname)
}

/**
 * Allows loopback peers and optional HEALTHCHECK_TOKEN / HEALTH_TOKEN
 * (`x-healthcheck-token` or Authorization Bearer). Query `?token=` is ignored.
 * Never authorizes from X-Forwarded-For or other forwarding headers.
 * Host: localhost is not a production fallback (spoofable).
 */
export function isAllowedHealthRequest(request: HealthAccessRequest): boolean {
	const expectedToken = getConfiguredHealthToken()
	const providedToken = readProvidedToken(request)

	if (expectedToken && providedToken && timingSafeTokenEqual(expectedToken, providedToken)) {
		return true
	}

	const peerIp = getDirectPeerIp(request)
	if (peerIp && isLoopbackIp(peerIp)) {
		return true
	}

	if (hasForwardingHeaders(request.headers)) {
		return false
	}

	if (peerIp) {
		return false
	}

	if (process.env.NODE_ENV === 'production') {
		return false
	}

	return hostLooksLoopback(request.headers)
}

export function isAllowedHealthHttpRequest(request: {
	headers: Headers
	nextUrl: { searchParams: URLSearchParams }
}): boolean {
	const ip = 'ip' in request ? (request as { ip?: string | null }).ip : undefined
	return isAllowedHealthRequest({
		headers: request.headers,
		ip,
		nextUrl: request.nextUrl,
	})
}

export function healthNotFoundResponse(): NextResponse {
	return new NextResponse(null, { status: 404 })
}
