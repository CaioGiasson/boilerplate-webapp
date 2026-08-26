import { ValidationError } from '@/errors'
import { sniffImageMime } from '@/utils/safeImageUrl'

/** ~4MB JSON body: base64 inflates decoded bytes by ~4/3 vs PROFILE_PHOTO_MAX_BYTES (3MB). */
export const IMAGE_JSON_BODY_MAX_BYTES = 4 * 1024 * 1024

export function estimateBase64DecodedBytes(base64: string): number {
	const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
	return Math.floor((base64.length * 3) / 4) - padding
}

export function normalizeImageMime(mime: string): string {
	const normalized = mime.trim().toLowerCase()
	if (normalized === 'image/jpg') return 'image/jpeg'
	return normalized
}

export function assertJsonBodyNotTooLarge(contentLengthHeader: string | null): void {
	if (!contentLengthHeader) return
	const contentLength = Number(contentLengthHeader)
	if (Number.isFinite(contentLength) && contentLength > IMAGE_JSON_BODY_MAX_BYTES) {
		throw new ValidationError('Request body is too large')
	}
}

export async function readJsonBodyCapped(request: Request, maxBytes = IMAGE_JSON_BODY_MAX_BYTES): Promise<unknown> {
	assertJsonBodyNotTooLarge(request.headers.get('content-length'))

	if (!request.body) {
		throw new ValidationError('Request body is required')
	}

	const reader = request.body.getReader()
	const chunks: Uint8Array[] = []
	let total = 0

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		total += value.byteLength
		if (total > maxBytes) {
			await reader.cancel()
			throw new ValidationError('Request body is too large')
		}
		chunks.push(value)
	}

	const raw = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8')
	try {
		return JSON.parse(raw) as unknown
	} catch {
		throw new ValidationError('Invalid JSON body')
	}
}

export function assertImageDataUrlStringNotTooLarge(image: string): void {
	if (image.length > IMAGE_JSON_BODY_MAX_BYTES) {
		throw new ValidationError('Request body is too large')
	}
}

export function assertSniffedImageMime(buffer: Buffer, claimedMime: string): string {
	const sniffed = sniffImageMime(buffer)
	if (!sniffed) {
		throw new ValidationError('Unsupported image type')
	}
	if (normalizeImageMime(claimedMime) !== sniffed) {
		throw new ValidationError('Image type does not match file contents')
	}
	return sniffed
}

export function parseImageDataUrl(dataUrl: string, maxDecodedBytes: number): { mimeType: string; buffer: Buffer } {
	const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
	if (!match?.[1] || !match[2]) {
		throw new ValidationError('Image must be a base64 data URL')
	}

	const claimedMime = match[1]
	const base64 = match[2]
	if (estimateBase64DecodedBytes(base64) > maxDecodedBytes) {
		throw new ValidationError('Image must be at most 3MB')
	}

	const buffer = Buffer.from(base64, 'base64')
	return {
		mimeType: assertSniffedImageMime(buffer, claimedMime),
		buffer,
	}
}
