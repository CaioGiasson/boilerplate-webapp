import {
	EXAMPLE_JWT_SECRET,
	EXAMPLE_MONGO_ROOT_PASSWORD,
	assertDatabaseUrl,
	assertEmailConfig,
	assertJwtSecret,
	getEmailConfig,
	getGoogleOAuthConfig,
	getJwtAudience,
	getJwtIssuer,
	getJwtSecret,
	isGoogleOAuthReady,
	validateEnv,
} from '@/config/env'

const STRONG_SECRET = 'a'.repeat(32)

function stubRequiredEnv(overrides: Record<string, string | undefined> = {}) {
	const base: Record<string, string> = {
		DATABASE_URL: 'mongodb://localhost:27017/vitraux',
		CACHE_LIFETIME_SECONDS: '21600',
		JWT_SECRET: STRONG_SECRET,
		SPACES_ENDPOINT: 'nyc3.digitaloceanspaces.com',
		SPACES_BUCKET: 'vitraux',
		SPACES_ACCESS_KEY_ID: 'key',
		SPACES_SECRET_ACCESS_KEY: 'secret',
		ENVIRONMENT: 'dev',
		EMAIL_PROVIDER: 'none',
	}

	const keys = new Set([...Object.keys(base), ...Object.keys(overrides)])
	for (const key of keys) {
		const value = key in overrides ? overrides[key] : base[key]
		if (value === undefined) {
			delete process.env[key]
		} else {
			process.env[key] = value
		}
	}
}

describe('assertJwtSecret', () => {
	it('rejeita vazio', () => {
		expect(() => assertJwtSecret('')).toThrow('JWT_SECRET must not be empty')
	})

	it('rejeita só whitespace', () => {
		expect(() => assertJwtSecret('   ')).toThrow('JWT_SECRET must not be empty')
	})

	it('rejeita o placeholder do .env.example', () => {
		expect(() => assertJwtSecret(EXAMPLE_JWT_SECRET)).toThrow('example placeholder')
		expect(() => assertJwtSecret(`  ${EXAMPLE_JWT_SECRET}  `)).toThrow('example placeholder')
	})

	it('rejeita secretos curtos', () => {
		expect(() => assertJwtSecret('short')).toThrow('at least 32')
		expect(() => assertJwtSecret('a'.repeat(16))).toThrow('at least 32')
		expect(() => assertJwtSecret('a'.repeat(31))).toThrow('at least 32')
	})

	it('aceita 32+ caracteres que não sejam o example', () => {
		expect(() => assertJwtSecret(STRONG_SECRET)).not.toThrow()
		expect(() => assertJwtSecret(`${STRONG_SECRET}-extra`)).not.toThrow()
	})
})

describe('assertDatabaseUrl', () => {
	it('aceita URL sem credencial em dev', () => {
		expect(() => assertDatabaseUrl('mongodb://localhost:27017/vitraux', 'dev')).not.toThrow()
	})

	it('rejeita URL sem credencial em prod', () => {
		expect(() => assertDatabaseUrl('mongodb://localhost:27017/vitraux', 'prod')).toThrow('credentials')
	})

	it('aceita URL com credencial em prod', () => {
		expect(() =>
			assertDatabaseUrl('mongodb://vitraux:secret@localhost:27717/vitraux?authSource=admin', 'prod')
		).not.toThrow()
	})

	it('rejeita senha example em prod', () => {
		expect(() =>
			assertDatabaseUrl(
				`mongodb://vitraux:${EXAMPLE_MONGO_ROOT_PASSWORD}@localhost:27717/vitraux?authSource=admin`,
				'prod'
			)
		).toThrow('example Mongo password')
	})
})

describe('validateEnv', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('falha quando JWT_SECRET é o example', () => {
		stubRequiredEnv({ JWT_SECRET: EXAMPLE_JWT_SECRET })
		expect(() => validateEnv()).toThrow('example placeholder')
	})

	it('falha quando JWT_SECRET é curto', () => {
		stubRequiredEnv({ JWT_SECRET: 'a'.repeat(31) })
		expect(() => validateEnv()).toThrow('at least 32')
	})

	it('passa com secret forte e vars obrigatórias', () => {
		stubRequiredEnv()
		expect(() => validateEnv()).not.toThrow()
	})

	it('falha em prod com DATABASE_URL sem credencial', () => {
		stubRequiredEnv({
			ENVIRONMENT: 'prod',
			DATABASE_URL: 'mongodb://localhost:27017/vitraux',
			EMAIL_PROVIDER: 'brevo',
			EMAIL_FROM: 'noreply@vitraux.test',
			BREVO_API_KEY: 'key',
		})
		expect(() => validateEnv()).toThrow('credentials')
	})

	it('falha em prod com EMAIL_PROVIDER=none', () => {
		stubRequiredEnv({
			ENVIRONMENT: 'prod',
			DATABASE_URL: 'mongodb://vitraux:secret@localhost:27717/vitraux?authSource=admin',
			EMAIL_PROVIDER: 'none',
		})
		expect(() => validateEnv()).toThrow('EMAIL_PROVIDER=none|disabled')
	})
})

describe('getEmailConfig / assertEmailConfig', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('default provider é none quando EMAIL_PROVIDER omitido', () => {
		delete process.env.EMAIL_PROVIDER
		expect(getEmailConfig().provider).toBe('none')
	})

	it('exige FROM e API key para brevo', () => {
		expect(() =>
			assertEmailConfig({
				provider: 'brevo',
				from: '',
				timeoutMs: 1000,
				brevoApiKey: '',
				brevoApiBaseUrl: 'https://api.brevo.com',
				brevoSandbox: false,
			})
		).toThrow('EMAIL_FROM')
	})
})

describe('getJwtSecret / issuer / audience', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('usa o secret trimmed na chave HMAC', () => {
		process.env.JWT_SECRET = `  ${STRONG_SECRET}  `
		const encoded = getJwtSecret()
		expect(new TextDecoder().decode(encoded)).toBe(STRONG_SECRET)
	})

	it('usa defaults de iss/aud', () => {
		delete process.env.JWT_ISSUER
		delete process.env.JWT_AUDIENCE
		expect(getJwtIssuer()).toBe('vitraux')
		expect(getJwtAudience()).toBe('vitraux-web')
	})

	it('respeita JWT_ISSUER e JWT_AUDIENCE', () => {
		process.env.JWT_ISSUER = 'custom-iss'
		process.env.JWT_AUDIENCE = 'custom-aud'
		expect(getJwtIssuer()).toBe('custom-iss')
		expect(getJwtAudience()).toBe('custom-aud')
	})
})

describe('getGoogleOAuthConfig / isGoogleOAuthReady', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('não está ready sem as três vars', () => {
		delete process.env.GOOGLE_OAUTH_CLIENT_ID
		delete process.env.GOOGLE_OAUTH_CLIENT_SECRET
		delete process.env.GOOGLE_OAUTH_REDIRECT_URI
		expect(isGoogleOAuthReady(getGoogleOAuthConfig())).toBe(false)
	})

	it('está ready com client id, secret e redirect', () => {
		process.env.GOOGLE_OAUTH_CLIENT_ID = 'cid'
		process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'csecret'
		process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/v1/auth/google/callback'
		const config = getGoogleOAuthConfig()
		expect(isGoogleOAuthReady(config)).toBe(true)
		expect(config.timeoutMs).toBe(10_000)
	})

	it('timeout inválido cai no default sem derrubar', () => {
		process.env.GOOGLE_OAUTH_TIMEOUT_MS = '0'
		expect(getGoogleOAuthConfig().timeoutMs).toBe(10_000)
		process.env.GOOGLE_OAUTH_TIMEOUT_MS = 'abc'
		expect(getGoogleOAuthConfig().timeoutMs).toBe(10_000)
		process.env.GOOGLE_OAUTH_TIMEOUT_MS = '5000'
		expect(getGoogleOAuthConfig().timeoutMs).toBe(5000)
	})
})
