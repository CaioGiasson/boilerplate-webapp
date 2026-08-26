import {
	getSwaggerConfig,
	isAllowedSwaggerRequest,
	isSwaggerConfigured,
	swaggerGateResponse,
} from '@/utils/swaggerAccess'

function authHeader(user: string, password: string): string {
	return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
}

function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
	const keys = Object.keys(vars)
	const previous = new Map(keys.map((key) => [key, process.env[key]]))
	try {
		for (const [key, value] of Object.entries(vars)) {
			if (value === undefined) {
				delete process.env[key]
			} else {
				process.env[key] = value
			}
		}
		run()
	} finally {
		for (const key of keys) {
			const value = previous.get(key)
			if (value === undefined) {
				delete process.env[key]
			} else {
				process.env[key] = value
			}
		}
	}
}

describe('swaggerAccess', () => {
	const credentials = { SWAGGER_ENABLED: 'true', SWAGGER_USER: 'docs', SWAGGER_PASSWORD: 's3cret' }

	it('isSwaggerConfigured requires enabled + user + password', () => {
		expect(isSwaggerConfigured(getSwaggerConfig({}))).toBe(false)
		expect(isSwaggerConfigured(getSwaggerConfig({ SWAGGER_ENABLED: 'true' }))).toBe(false)
		expect(
			isSwaggerConfigured(
				getSwaggerConfig({
					SWAGGER_ENABLED: 'true',
					SWAGGER_USER: 'docs',
					SWAGGER_PASSWORD: '',
				})
			)
		).toBe(false)
		expect(isSwaggerConfigured(getSwaggerConfig(credentials))).toBe(true)
	})

	it('accepts valid basic auth when configured', () => {
		const config = getSwaggerConfig(credentials)
		expect(
			isAllowedSwaggerRequest({ headers: new Headers({ authorization: authHeader('docs', 's3cret') }) }, config)
		).toBe(true)
	})

	it('rejects wrong password', () => {
		const config = getSwaggerConfig(credentials)
		expect(
			isAllowedSwaggerRequest({ headers: new Headers({ authorization: authHeader('docs', 'wrong') }) }, config)
		).toBe(false)
	})

	it('gate returns 404 when disabled', () => {
		withEnv({ SWAGGER_ENABLED: 'false', SWAGGER_USER: undefined, SWAGGER_PASSWORD: undefined }, () => {
			const res = swaggerGateResponse({ headers: new Headers() })
			expect(res?.status).toBe(404)
		})
	})

	it('gate returns 401 when enabled but unauthorized', () => {
		withEnv(credentials, () => {
			const res = swaggerGateResponse({ headers: new Headers() })
			expect(res?.status).toBe(401)
			expect(res?.headers.get('WWW-Authenticate')).toContain('Basic')
		})
	})

	it('gate returns null when authorized', () => {
		withEnv(credentials, () => {
			const res = swaggerGateResponse({
				headers: new Headers({ authorization: authHeader('docs', 's3cret') }),
			})
			expect(res).toBeNull()
		})
	})
})
