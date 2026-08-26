/**
 * SCALE-04 — smoke two Node instances (session cookie, rate limit, list).
 *
 * Usage:
 *   BASE_URL_A=http://127.0.0.1:3000 BASE_URL_B=http://127.0.0.1:3001 npm run smoke:multi-instance
 *
 * Optional auth smoke (upload skipped if unset):
 *   SMOKE_IDENTIFIER=alice SMOKE_PASSWORD=secret
 */
const baseA = (process.env.BASE_URL_A ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const baseB = (process.env.BASE_URL_B ?? 'http://127.0.0.1:3001').replace(/\/$/, '')

function fail(message) {
	console.error(`FAIL: ${message}`)
	process.exitCode = 1
}

function pass(message) {
	console.log(`OK: ${message}`)
}

async function fetchStatus(url, init = {}) {
	const response = await fetch(url, init)
	return response
}

async function main() {
	// Health
	for (const base of [baseA, baseB]) {
		const health = await fetchStatus(`${base}/api/health`)
		if (!health.ok) {
			fail(`${base}/api/health → ${health.status}`)
			return
		}
	}
	pass('health on both instances')

	// Public list
	for (const base of [baseA, baseB]) {
		const list = await fetchStatus(`${base}/api/v1/images?scope=all`)
		if (!list.ok) {
			fail(`${base} list → ${list.status}`)
			return
		}
	}
	pass('image list on both instances')

	const identifier = process.env.SMOKE_IDENTIFIER?.trim()
	const password = process.env.SMOKE_PASSWORD
	if (!identifier || !password) {
		console.log('SKIP: login/session/upload (set SMOKE_IDENTIFIER + SMOKE_PASSWORD)')
		return
	}

	const loginBody = JSON.stringify({ identifier, password, device: 'smoke-test' })
	const login = await fetchStatus(`${baseA}/api/v1/auth/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: baseA },
		body: loginBody,
	})
	if (!login.ok) {
		fail(`login on A → ${login.status}`)
		return
	}
	const cookie = login.headers.get('set-cookie')
	if (!cookie) {
		fail('login did not return Set-Cookie')
		return
	}
	pass('login on A')

	const meB = await fetchStatus(`${baseB}/api/v1/users/me`, {
		headers: { cookie },
	})
	if (!meB.ok) {
		fail(`session on B → ${meB.status} (JWT should work without sticky session)`)
		return
	}
	pass('session cookie valid on instance B')

	// Rate limit — 6th login should 429 on same instance
	let saw429 = false
	for (let i = 0; i < 6; i += 1) {
		const attempt = await fetchStatus(`${baseA}/api/v1/auth/login`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				origin: baseA,
				'x-forwarded-for': '203.0.113.50',
			},
			body: loginBody,
		})
		if (attempt.status === 429) {
			saw429 = true
			if (!attempt.headers.get('retry-after')) {
				fail('429 without Retry-After header')
				return
			}
			break
		}
	}
	if (!saw429) {
		fail('expected 429 after repeated logins (in-memory limiter)')
		return
	}
	pass('rate limit returns 429 + Retry-After')

	console.log('\nSmoke complete. See docs/operators/multi-instance-smoke.md')
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
