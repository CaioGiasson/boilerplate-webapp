import {
	buildContentSecurityPolicyReportOnly,
	buildEnforcedContentSecurityPolicy,
	buildSecurityHeaders,
	spacesImageSrcOrigins,
} from '@/config/securityHeaders'

const spacesEnv = {
	spacesEndpoint: 'nyc3.digitaloceanspaces.com',
	spacesBucket: 'app',
	spacesPublicBaseUrl: 'https://app.nyc3.cdn.digitaloceanspaces.com',
}

function headerMap(headers: ReturnType<typeof buildSecurityHeaders>) {
	return Object.fromEntries(headers.map((header) => [header.key, header.value]))
}

describe('securityHeaders', () => {
	it('omits HSTS in development so localhost HTTP keeps working', () => {
		const headers = headerMap(buildSecurityHeaders({ nodeEnv: 'development', ...spacesEnv }))
		expect(headers['Strict-Transport-Security']).toBeUndefined()
		expect(headers['X-Content-Type-Options']).toBe('nosniff')
		expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
		expect(headers['Permissions-Policy']).toContain('camera=()')
		expect(headers['Permissions-Policy']).toContain('microphone=()')
		expect(headers['Permissions-Policy']).toContain('geolocation=()')
		expect(headers['X-Frame-Options']).toBe('DENY')
	})

	it('sends HSTS in production', () => {
		const headers = headerMap(buildSecurityHeaders({ nodeEnv: 'production', ...spacesEnv }))
		expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains')
	})

	it('enforces clickjacking protection independently of report-only CSP', () => {
		expect(buildEnforcedContentSecurityPolicy()).toBe("frame-ancestors 'none'")
		const headers = headerMap(buildSecurityHeaders({ nodeEnv: 'production', ...spacesEnv }))
		expect(headers['Content-Security-Policy']).toBe("frame-ancestors 'none'")
		expect(headers['Content-Security-Policy-Report-Only']).toContain("frame-ancestors 'none'")
		expect(headers['Content-Security-Policy-Report-Only']).toContain("script-src 'self' 'unsafe-inline'")
		expect(headers['Content-Security-Policy-Report-Only']).toContain("connect-src 'self'")
		expect(headers['Content-Security-Policy-Report-Only']).not.toContain('unsafe-eval')
	})

	it('allows DigitalOcean Spaces image hosts in report-only CSP', () => {
		const origins = spacesImageSrcOrigins(spacesEnv)
		expect(origins).toEqual(
			expect.arrayContaining([
				'https://*.digitaloceanspaces.com',
				'https://app.nyc3.digitaloceanspaces.com',
				'https://*.nyc3.digitaloceanspaces.com',
				'https://app.nyc3.cdn.digitaloceanspaces.com',
			])
		)

		const reportOnly = buildContentSecurityPolicyReportOnly({ nodeEnv: 'production', ...spacesEnv })
		expect(reportOnly).toContain('https://*.digitaloceanspaces.com')
		expect(reportOnly).toContain('https://app.nyc3.digitaloceanspaces.com')
		expect(reportOnly).toContain('https://app.nyc3.cdn.digitaloceanspaces.com')
		expect(reportOnly).toContain("img-src 'self' data: blob:")
	})

	it('relaxes script and connect sources in development report-only policy', () => {
		const reportOnly = buildContentSecurityPolicyReportOnly({ nodeEnv: 'development', ...spacesEnv })
		expect(reportOnly).toContain("'unsafe-eval'")
		expect(reportOnly).toContain('ws:')
	})
})
