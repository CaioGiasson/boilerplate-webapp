import { lookup as dnsLookup } from 'node:dns/promises'
import { Agent, fetch as undiciFetch } from 'undici'
import { ValidationError } from '@/errors'
import { PROFILE_PHOTO_MAX_BYTES } from '@/useCases/uploadUserPhoto.usecase'
import { isBlockedIp, parsePublicHttpUrl, sniffImageMime } from '@/utils/safeImageUrl'

const MAX_REDIRECTS = 3
const FETCH_TIMEOUT_MS = 10_000
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

type LookupAddress = { address: string }
type LookupFn = (hostname: string) => Promise<LookupAddress[]>
type FetchFn = typeof fetch

export type RemoteFetchResult = {
	buffer: Buffer
	mimeType: string
}

async function lookupAllAddresses(hostname: string): Promise<LookupAddress[]> {
	return dnsLookup(hostname, { all: true })
}

function pinnedFetch(url: string | URL, init?: RequestInit): Promise<Response> {
	const dispatcher = new Agent({
		connect: {
			lookup(hostname, _options, callback) {
				void dnsLookup(hostname, { all: true }).then(
					(addresses) => {
						const allowed = addresses.filter((item) => !isBlockedIp(item.address))
						if (allowed.length === 0) {
							callback(new Error('blocked'), '', 4)
							return
						}
						const chosen = allowed[0]
						const family = chosen.family === 6 ? 6 : 4
						callback(null, chosen.address, family)
					},
					(error: Error) => callback(error, '', 4)
				)
			},
		},
	})
	return undiciFetch(url, { ...init, dispatcher } as Parameters<
		typeof undiciFetch
	>[1]) as unknown as Promise<Response>
}

/** SSRF-safe fetch for remote avatar/profile images. */
export default class RemoteFetchService {
	constructor(
		private lookup: LookupFn = lookupAllAddresses,
		private fetchImpl: FetchFn = pinnedFetch as FetchFn
	) {}

	async fetchImage(urlString: string): Promise<RemoteFetchResult> {
		try {
			const response = await this.fetchFollowing(parsePublicHttpUrl(urlString), MAX_REDIRECTS)
			const buffer = await readLimitedBody(response, PROFILE_PHOTO_MAX_BYTES)
			const mimeType = sniffImageMime(buffer)
			if (!mimeType) {
				throw new ValidationError('URL is not a valid image')
			}
			return { buffer, mimeType }
		} catch (error: unknown) {
			if (error instanceof ValidationError) throw error
			throw new ValidationError('Could not download image')
		}
	}

	private async fetchFollowing(url: URL, redirectsLeft: number): Promise<Response> {
		await this.assertPublicHost(url.hostname)

		const response = await this.fetchImpl(url.toString(), {
			method: 'GET',
			redirect: 'manual',
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: {
				Accept: 'image/jpeg,image/png,image/webp,image/gif,*/*;q=0.1',
			},
		})

		if (REDIRECT_STATUSES.has(response.status)) {
			if (redirectsLeft <= 0) {
				throw new ValidationError('Invalid image URL')
			}
			const location = response.headers.get('location')
			if (!location) {
				throw new ValidationError('Invalid image URL')
			}
			const next = parsePublicHttpUrl(new URL(location, url).toString())
			return this.fetchFollowing(next, redirectsLeft - 1)
		}

		if (!response.ok) {
			throw new ValidationError('Could not download image')
		}

		return response
	}

	private async assertPublicHost(hostname: string): Promise<void> {
		const host = hostname.replace(/^\[|\]$/g, '')
		if (isBlockedIp(host)) {
			throw new ValidationError('Invalid image URL')
		}

		let addresses: LookupAddress[]
		try {
			addresses = await this.lookup(host)
		} catch {
			throw new ValidationError('Invalid image URL')
		}

		if (addresses.length === 0 || addresses.some((item) => isBlockedIp(item.address))) {
			throw new ValidationError('Invalid image URL')
		}
	}
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Buffer> {
	if (!response.body) {
		throw new ValidationError('URL is not a valid image')
	}

	const reader = response.body.getReader()
	const chunks: Uint8Array[] = []
	let total = 0

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		total += value.byteLength
		if (total > maxBytes) {
			await reader.cancel()
			throw new ValidationError('Image exceeds size limit')
		}
		chunks.push(value)
	}

	return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}
