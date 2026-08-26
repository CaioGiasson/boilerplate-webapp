import { TooManyRequestsError } from '@/errors'

/**
 * In-memory rate limiter for Node API routes (not next-intl edge middleware).
 *
 * Current deploy model: **single machine / single Node process** (see
 * `docs/architecture.md`). Process-local Map is acceptable; it resets on restart.
 *
 * If the architecture moves to multiple pods behind a load balancer, do **not**
 * rely on this alone — enforce rate limits at the **API gateway** (preferred) or
 * swap the store for Redis. Historical tracking: issue #127 (SCALE-02, N/A while single-node).
 *
 * Phase 2 (not implemented): CAPTCHA (Turnstile/hCaptcha) after repeated
 * lockouts — no provider or credentials in this change.
 *
 * Defaults for auth/nickname routes: 5 requests / 60s per IP+identifier key.
 * Progressive lockout after consecutive limit hits: 60s, then 5min, then 15min.
 * Consecutive hits reset after 15min idle (no consumes for that key).
 */

export const AUTH_RATE_LIMIT_MAX = 5
export const AUTH_RATE_LIMIT_WINDOW_MS = 60_000
export const AUTH_RATE_LIMIT_LOCKOUTS_MS = [60_000, 5 * 60_000, 15 * 60_000] as const
export const AUTH_RATE_LIMIT_IDLE_RESET_MS = 15 * 60_000
export const AUTH_RATE_LIMIT_MESSAGE = 'Too many requests. Try again later.'

/** Image list (scope=all/mine): 120 req/min per IP (+ user when authenticated). */
export const IMAGE_LIST_RATE_LIMIT_MAX = 120
export const IMAGE_LIST_RATE_LIMIT_WINDOW_MS = 60_000

/** Image upload: 30 req/min per IP+user. */
export const IMAGE_UPLOAD_RATE_LIMIT_MAX = 30
export const IMAGE_UPLOAD_RATE_LIMIT_WINDOW_MS = 60_000

/** Remote import: 15 req/min per IP+user. */
export const IMAGE_IMPORT_RATE_LIMIT_MAX = 15
export const IMAGE_IMPORT_RATE_LIMIT_WINDOW_MS = 60_000

export type RateLimitRequest = {
	headers: {
		get(name: string): string | null
	}
}

export type RateLimiter = {
	consume(key: string): void
}

type Bucket = {
	count: number
	windowStart: number
	consecutiveLimitHits: number
	lockUntil: number
	lastSeen: number
}

export type InMemoryRateLimiterOptions = {
	max?: number
	windowMs?: number
	lockoutsMs?: readonly number[]
	idleResetMs?: number
	now?: () => number
}

export class InMemoryRateLimiter implements RateLimiter {
	private readonly store = new Map<string, Bucket>()
	private readonly max: number
	private readonly windowMs: number
	private readonly lockoutsMs: readonly number[]
	private readonly idleResetMs: number
	private readonly now: () => number

	constructor(options: InMemoryRateLimiterOptions = {}) {
		this.max = options.max ?? AUTH_RATE_LIMIT_MAX
		this.windowMs = options.windowMs ?? AUTH_RATE_LIMIT_WINDOW_MS
		this.lockoutsMs = options.lockoutsMs ?? AUTH_RATE_LIMIT_LOCKOUTS_MS
		this.idleResetMs = options.idleResetMs ?? AUTH_RATE_LIMIT_IDLE_RESET_MS
		this.now = options.now ?? Date.now
	}

	clear(): void {
		this.store.clear()
	}

	consume(key: string): void {
		const now = this.now()
		this.pruneIdle(now)
		const existing = this.store.get(key)
		const bucket = this.reviveOrCreate(key, existing, now)

		if (now < bucket.lockUntil) {
			bucket.lastSeen = now
			this.store.set(key, bucket)
			throw this.tooMany(bucket.lockUntil, now)
		}

		if (now - bucket.windowStart >= this.windowMs) {
			bucket.count = 0
			bucket.windowStart = now
		}

		bucket.count += 1
		bucket.lastSeen = now

		if (bucket.count > this.max) {
			bucket.consecutiveLimitHits += 1
			const lockMs = this.lockoutsMs[Math.min(bucket.consecutiveLimitHits - 1, this.lockoutsMs.length - 1)]
			bucket.lockUntil = now + lockMs
			this.store.set(key, bucket)
			throw this.tooMany(bucket.lockUntil, now)
		}

		this.store.set(key, bucket)
	}

	private pruneIdle(now: number): void {
		if (this.store.size < 2048) {
			return
		}
		for (const [key, bucket] of this.store) {
			if (now - bucket.lastSeen >= this.idleResetMs && now >= bucket.lockUntil) {
				this.store.delete(key)
			}
		}
	}

	private reviveOrCreate(key: string, existing: Bucket | undefined, now: number): Bucket {
		if (!existing || now - existing.lastSeen >= this.idleResetMs) {
			const fresh: Bucket = {
				count: 0,
				windowStart: now,
				consecutiveLimitHits: 0,
				lockUntil: 0,
				lastSeen: now,
			}
			this.store.set(key, fresh)
			return fresh
		}
		return existing
	}

	private tooMany(lockUntil: number, now: number): TooManyRequestsError {
		const retryAfterSeconds = Math.max(1, Math.ceil((lockUntil - now) / 1000))
		return new TooManyRequestsError(AUTH_RATE_LIMIT_MESSAGE, retryAfterSeconds)
	}
}

const defaultAuthRateLimiter = new InMemoryRateLimiter()
const imageListRateLimiter = new InMemoryRateLimiter({
	max: IMAGE_LIST_RATE_LIMIT_MAX,
	windowMs: IMAGE_LIST_RATE_LIMIT_WINDOW_MS,
	lockoutsMs: [IMAGE_LIST_RATE_LIMIT_WINDOW_MS],
})
const imageUploadRateLimiter = new InMemoryRateLimiter({
	max: IMAGE_UPLOAD_RATE_LIMIT_MAX,
	windowMs: IMAGE_UPLOAD_RATE_LIMIT_WINDOW_MS,
	lockoutsMs: [IMAGE_UPLOAD_RATE_LIMIT_WINDOW_MS],
})
const imageImportRateLimiter = new InMemoryRateLimiter({
	max: IMAGE_IMPORT_RATE_LIMIT_MAX,
	windowMs: IMAGE_IMPORT_RATE_LIMIT_WINDOW_MS,
	lockoutsMs: [IMAGE_IMPORT_RATE_LIMIT_WINDOW_MS],
})

export function resetAuthRateLimitStoreForTests(): void {
	defaultAuthRateLimiter.clear()
	imageListRateLimiter.clear()
	imageUploadRateLimiter.clear()
	imageImportRateLimiter.clear()
}

export function extractClientIp(request: RateLimitRequest): string {
	const trusted =
		request.headers.get('do-connecting-ip')?.trim() ||
		request.headers.get('cf-connecting-ip')?.trim() ||
		request.headers.get('x-real-ip')?.trim()
	if (trusted) {
		return normalizeIp(trusted)
	}

	const forwarded = request.headers.get('x-forwarded-for')
	if (forwarded) {
		const hops = forwarded
			.split(',')
			.map((hop) => hop.trim())
			.filter(Boolean)
		const lastHop = hops.at(-1)
		if (lastHop) {
			return normalizeIp(lastHop)
		}
	}

	return 'unknown'
}

export function normalizeRateLimitKeyPart(value: string): string {
	return value.trim().toLowerCase()
}

export function rateLimitKeyPartFromBody(body: unknown, fields: string[]): string {
	if (!body || typeof body !== 'object') {
		return ''
	}
	const record = body as Record<string, unknown>
	return fields.map((field) => (typeof record[field] === 'string' ? record[field] : '')).join('|')
}

export function assertRateLimit(
	request: RateLimitRequest,
	routeKey: string,
	suffix: string,
	limiter: RateLimiter
): void {
	const ip = extractClientIp(request)
	const route = normalizeRateLimitKeyPart(routeKey)
	const keySuffix = normalizeRateLimitKeyPart(suffix)
	limiter.consume(`${ip}:${route}:${keySuffix}`)
}

export function assertAuthRateLimit(
	request: RateLimitRequest,
	keySuffix: string,
	limiter: RateLimiter = defaultAuthRateLimiter
): void {
	assertRateLimit(request, 'auth', keySuffix, limiter)
}

export function assertImageListRateLimit(request: RateLimitRequest, userId?: string): void {
	assertRateLimit(request, 'image-list', userId?.trim() || 'anon', imageListRateLimiter)
}

export function assertImageUploadRateLimit(request: RateLimitRequest, userId: string): void {
	assertRateLimit(request, 'image-upload', userId, imageUploadRateLimiter)
}

export function assertImageImportRateLimit(request: RateLimitRequest, userId: string): void {
	assertRateLimit(request, 'image-import', userId, imageImportRateLimiter)
}

function normalizeIp(ip: string): string {
	const lowered = ip.toLowerCase()
	if (lowered.startsWith('::ffff:')) {
		return lowered.slice('::ffff:'.length)
	}
	return lowered
}
