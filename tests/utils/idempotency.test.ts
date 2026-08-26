import { NextRequest, NextResponse } from 'next/server'
import { resetIdempotencyStoreForTests, withIdempotencyKey } from '@/utils/idempotency'

describe('withIdempotencyKey', () => {
	beforeEach(() => {
		resetIdempotencyStoreForTests()
	})

	it('runs handler when header is absent', async () => {
		const request = new NextRequest('http://localhost/api', { method: 'POST' })
		let calls = 0
		const first = await withIdempotencyKey(request, 'user:1', async () => {
			calls += 1
			return NextResponse.json({ ok: true }, { status: 201 })
		})
		const second = await withIdempotencyKey(request, 'user:1', async () => {
			calls += 1
			return NextResponse.json({ ok: true }, { status: 201 })
		})
		expect(calls).toBe(2)
		expect(first.status).toBe(201)
		expect(second.status).toBe(201)
	})

	it('replays successful response for the same key', async () => {
		const request = new NextRequest('http://localhost/api', {
			method: 'POST',
			headers: { 'Idempotency-Key': 'k1' },
		})
		let calls = 0
		const first = await withIdempotencyKey(request, 'user:1', async () => {
			calls += 1
			return NextResponse.json({ n: calls }, { status: 201 })
		})
		const second = await withIdempotencyKey(request, 'user:1', async () => {
			calls += 1
			return NextResponse.json({ n: calls }, { status: 201 })
		})
		expect(calls).toBe(1)
		expect(await first.json()).toEqual({ n: 1 })
		expect(await second.json()).toEqual({ n: 1 })
		expect(second.headers.get('Idempotency-Replayed')).toBe('true')
	})

	it('does not cache error responses', async () => {
		const request = new NextRequest('http://localhost/api', {
			method: 'POST',
			headers: { 'Idempotency-Key': 'k-err' },
		})
		let calls = 0
		await withIdempotencyKey(request, 'user:1', async () => {
			calls += 1
			return NextResponse.json({ error: true }, { status: 400 })
		})
		await withIdempotencyKey(request, 'user:1', async () => {
			calls += 1
			return NextResponse.json({ error: true }, { status: 400 })
		})
		expect(calls).toBe(2)
	})
})
