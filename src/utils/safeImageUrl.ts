import ipaddr from 'ipaddr.js'
import { ValidationError } from '@/errors'

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal'])

export function parsePublicHttpUrl(raw: string): URL {
	let url: URL
	try {
		url = new URL(raw.trim())
	} catch {
		throw new ValidationError('Invalid image URL')
	}

	if (url.protocol !== 'https:' && url.protocol !== 'http:') {
		throw new ValidationError('Invalid image URL')
	}
	if (url.username || url.password) {
		throw new ValidationError('Invalid image URL')
	}
	if (!url.hostname) {
		throw new ValidationError('Invalid image URL')
	}

	const host = normalizeIpLiteral(url.hostname)
	if (isBlockedHostname(host)) {
		throw new ValidationError('Invalid image URL')
	}
	if (isNonDottedNumericHost(host) || isBlockedIp(host)) {
		throw new ValidationError('Invalid image URL')
	}

	return url
}

function normalizeIpLiteral(ip: string): string {
	return ip.replace(/^\[|\]$/g, '').toLowerCase()
}

function ipv4FromMappedIpv6(ip: string): string | null {
	const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip)
	if (dotted) return dotted[1]
	const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip)
	if (!hex) return null
	const high = Number.parseInt(hex[1], 16)
	const low = Number.parseInt(hex[2], 16)
	return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`
}

function ipv4From6to4(ip: string): string | null {
	if (!ip.startsWith('2002:')) return null
	const rest = ip.slice('2002:'.length)
	const hexParts = rest.split(':').filter(Boolean)
	if (hexParts.length < 2) return null
	const high = Number.parseInt(hexParts[0] ?? '', 16)
	const low = Number.parseInt(hexParts[1] ?? '', 16)
	if (Number.isNaN(high) || Number.isNaN(low)) return null
	return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`
}

export function isNonDottedNumericHost(host: string): boolean {
	return /^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)
}

/** Literal que parece IPv4 (decimal, hex ou misto) — se não for IP válido, é malformado e deve ser recusado. */
const IPV4_LIKE_LITERAL = /^(?:0x[0-9a-f]+|\d+)(?:\.(?:0x[0-9a-f]+|\d+))*$/i

function isNonPublicAddress(address: string): boolean {
	return ipaddr.process(address).range() !== 'unicast'
}

/**
 * True para IP literal que não seja unicast público (privado, loopback, link-local, CGNAT, multicast, reservado,
 * documentação, Teredo…) e para literal IPv4 malformado. Nome de host (não-IP) devolve false: a resolução
 * DNS é conferida depois (`RemoteFetch.assertPublicHost`).
 */
export function isBlockedIp(ip: string): boolean {
	const normalized = normalizeIpLiteral(ip)
	if (isNonDottedNumericHost(normalized)) {
		const asNumber = normalized.startsWith('0x') ? Number.parseInt(normalized.slice(2), 16) : Number(normalized)
		if (Number.isSafeInteger(asNumber) && asNumber >= 0 && asNumber <= 0xffffffff) {
			const dotted = `${(asNumber >>> 24) & 255}.${(asNumber >>> 16) & 255}.${(asNumber >>> 8) & 255}.${asNumber & 255}`
			return isNonPublicAddress(dotted)
		}
		return true
	}
	const mappedIpv4 = ipv4FromMappedIpv6(normalized)
	if (mappedIpv4) return isNonPublicAddress(mappedIpv4)
	const sixToFour = ipv4From6to4(normalized)
	if (sixToFour) return isNonPublicAddress(sixToFour)
	if (ipaddr.isValid(normalized)) return isNonPublicAddress(normalized)

	return IPV4_LIKE_LITERAL.test(normalized)
}

/** Nomes que nunca devem ser buscados: loopback, domínios internos e metadata de nuvem. */
export function isBlockedHostname(hostname: string): boolean {
	const host = normalizeIpLiteral(hostname).replace(/\.$/, '')
	return (
		host.length === 0 ||
		BLOCKED_HOSTS.has(host) ||
		host.endsWith('.localhost') ||
		host.endsWith('.local') ||
		host.endsWith('.internal')
	)
}

export function sniffImageMime(buffer: Buffer): string | null {
	if (buffer.length < 12) return null
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
	if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
	if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif'
	if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
		return 'image/webp'
	}
	return null
}

export function isHttpUrlString(value: string): boolean {
	try {
		parsePublicHttpUrl(value)
		return true
	} catch {
		return false
	}
}
