/**
 * QA-03 — k6 load smoke: public image list + login path.
 *
 * Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
 *
 * Run against local dev or staging:
 *   k6 run tests/load/list-and-auth.k6.js
 *   BASE_URL=https://staging.example.com k6 run tests/load/list-and-auth.k6.js
 *
 * Thresholds (adjust per environment):
 *   - http_req_failed < 1%
 *   - p95 list < 800ms (local), tighten for staging/prod baselines
 */
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const IDENTIFIER = __ENV.K6_IDENTIFIER || ''
const PASSWORD = __ENV.K6_PASSWORD || ''

export const options = {
	vus: 5,
	duration: '30s',
	thresholds: {
		http_req_failed: ['rate<0.01'],
		'http_req_duration{name:list}': ['p(95)<800'],
		'http_req_duration{name:login}': ['p(95)<1500'],
	},
}

export default function () {
	const listRes = http.get(`${BASE_URL}/api/v1/images?scope=all`, {
		tags: { name: 'list' },
	})
	check(listRes, {
		'list status 200': (r) => r.status === 200,
	})

	if (IDENTIFIER && PASSWORD) {
		const loginRes = http.post(
			`${BASE_URL}/api/v1/auth/login`,
			JSON.stringify({ identifier: IDENTIFIER, password: PASSWORD, device: 'k6' }),
			{
				headers: {
					'Content-Type': 'application/json',
					Origin: BASE_URL,
				},
				tags: { name: 'login' },
			}
		)
		check(loginRes, {
			'login status 200 or 429': (r) => r.status === 200 || r.status === 429,
		})
	}

	sleep(0.5)
}
