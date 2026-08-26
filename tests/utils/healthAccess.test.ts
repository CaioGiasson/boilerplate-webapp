import { hasForwardingHeaders, isAllowedHealthRequest, isLoopbackIp, normalizeIp } from '@/utils/healthAccess'
import { isExampleEndpointEnabled } from '@/utils/exampleEndpoint'

function healthRequest(init: {
	headers?: Record<string, string>
	ip?: string | null
	tokenQuery?: string
}): Parameters<typeof isAllowedHealthRequest>[0] {
	const headers = new Headers(init.headers)
	const searchParams = new URLSearchParams()
	if (init.tokenQuery !== undefined) {
		searchParams.set('token', init.tokenQuery)
	}

	return {
		headers,
		ip: init.ip,
		nextUrl: { searchParams },
	}
}

describe('healthAccess', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
		delete process.env.HEALTHCHECK_TOKEN
		delete process.env.HEALTH_TOKEN
	})

	it('normaliza IPv4-mapped IPv6 e porta', () => {
		expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1')
		expect(normalizeIp('127.0.0.1:3000')).toBe('127.0.0.1')
		expect(normalizeIp('[::1]:3000')).toBe('::1')
		expect(isLoopbackIp('::ffff:127.0.0.1')).toBe(true)
		expect(isLoopbackIp('::1')).toBe(true)
		expect(isLoopbackIp('10.0.0.1')).toBe(false)
	})

	it('permite peer loopback sem token', () => {
		expect(isAllowedHealthRequest(healthRequest({ ip: '127.0.0.1' }))).toBe(true)
		expect(isAllowedHealthRequest(healthRequest({ ip: '::1' }))).toBe(true)
		expect(isAllowedHealthRequest(healthRequest({ ip: '::ffff:127.0.0.1' }))).toBe(true)
	})

	it('não autoriza via X-Forwarded-For spoof quando o peer não é local', () => {
		expect(
			isAllowedHealthRequest(
				healthRequest({
					ip: '203.0.113.10',
					headers: { 'x-forwarded-for': '127.0.0.1' },
				})
			)
		).toBe(false)
		expect(
			isAllowedHealthRequest(
				healthRequest({
					ip: '203.0.113.10',
					headers: { 'x-real-ip': '127.0.0.1' },
				})
			)
		).toBe(false)
		expect(hasForwardingHeaders(new Headers({ 'x-forwarded-for': '127.0.0.1' }))).toBe(true)
	})

	it('não autoriza Host localhost quando há X-Forwarded-For e o peer não é local', () => {
		expect(
			isAllowedHealthRequest(
				healthRequest({
					headers: {
						host: 'localhost:3000',
						'x-forwarded-for': '127.0.0.1',
					},
				})
			)
		).toBe(false)
	})

	it('permite Host loopback só em conexão direta fora de production', () => {
		process.env.NODE_ENV = 'test'
		expect(isAllowedHealthRequest(healthRequest({ headers: { host: 'localhost:3000' } }))).toBe(true)
		expect(isAllowedHealthRequest(healthRequest({ headers: { host: '127.0.0.1:3000' } }))).toBe(true)
		expect(isAllowedHealthRequest(healthRequest({ headers: { host: 'example.com' } }))).toBe(false)
	})

	it('não autoriza Host loopback em production sem peer loopback nem token', () => {
		process.env.NODE_ENV = 'production'
		expect(isAllowedHealthRequest(healthRequest({ headers: { host: 'localhost:3000' } }))).toBe(false)
	})

	it('aceita HEALTHCHECK_TOKEN opcional para peers remotos', () => {
		process.env.HEALTHCHECK_TOKEN = 'probe-secret'
		expect(
			isAllowedHealthRequest(
				healthRequest({
					ip: '203.0.113.10',
					headers: { 'x-healthcheck-token': 'probe-secret' },
				})
			)
		).toBe(true)
		expect(
			isAllowedHealthRequest(
				healthRequest({
					ip: '203.0.113.10',
					headers: { authorization: 'Bearer probe-secret' },
				})
			)
		).toBe(true)
		expect(
			isAllowedHealthRequest(
				healthRequest({
					ip: '203.0.113.10',
					tokenQuery: 'probe-secret',
				})
			)
		).toBe(false)
		expect(
			isAllowedHealthRequest(
				healthRequest({
					ip: '203.0.113.10',
					headers: { 'x-healthcheck-token': 'wrong' },
				})
			)
		).toBe(false)
	})

	it('token vazio não abre health remoto', () => {
		process.env.HEALTHCHECK_TOKEN = '   '
		expect(isAllowedHealthRequest(healthRequest({ ip: '203.0.113.10' }))).toBe(false)
	})
})

describe('isExampleEndpointEnabled', () => {
	it('fica desligado em production', () => {
		expect(isExampleEndpointEnabled('production')).toBe(false)
	})

	it('fica ligado em development e test', () => {
		expect(isExampleEndpointEnabled('development')).toBe(true)
		expect(isExampleEndpointEnabled('test')).toBe(true)
		expect(isExampleEndpointEnabled(undefined)).toBe(true)
	})
})
