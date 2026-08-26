import { NextRequest, NextResponse } from 'next/server'
import { ValidationError } from '@/errors'

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000
const IDEMPOTENCY_KEY_MAX_LENGTH = 128

type StoredResponse = {
	status: number
	body: unknown
	expiresAt: number
}

const store = new Map<string, StoredResponse>()
const inFlight = new Map<string, Promise<NextResponse>>()

/** Test helper — clears process-local idempotency store. */
export function resetIdempotencyStoreForTests(): void {
	store.clear()
	inFlight.clear()
}

function pruneExpired(now = Date.now()): void {
	for (const [key, value] of store) {
		if (value.expiresAt <= now) store.delete(key)
	}
}

/**
 * API-06 — optional `Idempotency-Key` header; successful responses replay for 24h (in-memory, single-machine).
 * Missing header = normal request (no store). Concurrent same key waits on the first execution.
 */
export async function withIdempotencyKey(
	request: NextRequest,
	scope: string,
	run: () => Promise<NextResponse>
): Promise<NextResponse> {
	const raw = request.headers.get('idempotency-key')?.trim()
	if (!raw) {
		return run()
	}
	if (raw.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
		throw new ValidationError('Idempotency-Key is too long')
	}

	pruneExpired()
	const storeKey = `${scope}:${raw}`
	const cached = store.get(storeKey)
	if (cached && cached.expiresAt > Date.now()) {
		return NextResponse.json(cached.body, {
			status: cached.status,
			headers: { 'Idempotency-Replayed': 'true' },
		})
	}

	const pending = inFlight.get(storeKey)
	if (pending) {
		const shared = await pending
		const body = await shared.clone().json()
		return NextResponse.json(body, {
			status: shared.status,
			headers: { 'Idempotency-Replayed': 'true' },
		})
	}

	const execution = (async () => {
		const response = await run()
		if (response.status >= 200 && response.status < 300) {
			try {
				const body = await response.clone().json()
				store.set(storeKey, {
					status: response.status,
					body,
					expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
				})
			} catch {
				// non-JSON success — do not store
			}
		}
		return response
	})()

	inFlight.set(storeKey, execution)
	try {
		return await execution
	} finally {
		inFlight.delete(storeKey)
	}
}
