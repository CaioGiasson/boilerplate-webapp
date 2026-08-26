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
	if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
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

export function isBlockedIp(ip: string): boolean {
	const normalized = normalizeIpLiteral(ip)
	if (isNonDottedNumericHost(normalized)) {
		const asNumber = normalized.startsWith('0x') ? Number.parseInt(normalized.slice(2), 16) : Number(normalized)
		if (Number.isSafeInteger(asNumber) && asNumber >= 0 && asNumber <= 0xffffffff) {
			const dotted = `${(asNumber >>> 24) & 255}.${(asNumber >>> 16) & 255}.${(asNumber >>> 8) & 255}.${asNumber & 255}`
			return isBlockedIpv4(dotted)
		}
		return true
	}
	const mappedIpv4 = ipv4FromMappedIpv6(normalized)
	if (mappedIpv4) return isBlockedIpv4(mappedIpv4)
	const sixToFour = ipv4From6to4(normalized)
	if (sixToFour) return isBlockedIpv4(sixToFour)
	if (normalized.includes(':')) return isBlockedIpv6(normalized)
	return isBlockedIpv4(normalized)
}

function isBlockedIpv4(ip: string): boolean {
	const labels = ip.split('.')
	if (labels.length !== 4) return false
	if (labels.some((label) => !/^(0|[1-9]\d{0,2})$/.test(label))) return true
	const parts = labels.map((part) => Number(part))
	if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
		return true
	}
	const [a, b] = parts
	if (a === 0 || a === 10 || a === 127) return true
	if (a === 169 && b === 254) return true
	if (a === 172 && b >= 16 && b <= 31) return true
	if (a === 192 && b === 168) return true
	if (a === 100 && b >= 64 && b <= 127) return true
	if (a >= 224) return true
	return false
}

function isBlockedIpv6(ip: string): boolean {
	if (ip === '::1' || ip === '::') return true
	if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fec0:')) return true
	if (ip === '64:ff9b::' || ip.startsWith('64:ff9b:')) return true
	return false
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
