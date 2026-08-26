const REQUIRED_ENV_VARS = [
	'DATABASE_URL',
	'CACHE_LIFETIME_SECONDS',
	'JWT_SECRET',
	'SPACES_ENDPOINT',
	'SPACES_BUCKET',
	'SPACES_ACCESS_KEY_ID',
	'SPACES_SECRET_ACCESS_KEY',
	'ENVIRONMENT',
] as const

/** Placeholder from `.env.example` — never a valid runtime secret. */
export const EXAMPLE_JWT_SECRET = 'change-me-in-production-use-a-long-random-string'

/** Placeholder Mongo password from `.env.example`. */
export const EXAMPLE_MONGO_ROOT_PASSWORD = 'change-me-generate-with-openssl-rand-base64-24'

/** Requires user:password@ in mongodb:// or mongodb+srv:// URLs. */
const DATABASE_URL_WITH_CREDENTIALS = /^mongodb(\+srv)?:\/\/[^/@\s]+:[^/@\s]+@/

function passwordFromDatabaseUrl(url: string): string | null {
	const match = url.match(/^mongodb(\+srv)?:\/\/[^/@\s]+:([^/@\s]+)@/)
	if (!match?.[2]) {
		return null
	}

	try {
		return decodeURIComponent(match[2])
	} catch {
		return match[2]
	}
}

function isProductionEnvironment(environment: string): boolean {
	const env = environment.trim().toLowerCase()
	return env === 'prod' || env === 'production'
}

const MIN_JWT_SECRET_LENGTH = 32
const DEFAULT_JWT_ISSUER = 'vitraux'
const DEFAULT_JWT_AUDIENCE = 'vitraux-web'

export type StorageConfig = {
	spacesEndpoint: string
	spacesBucket: string
	spacesAccessKeyId: string
	spacesSecretAccessKey: string
	spacesPublicBaseUrl: string
	environment: string
}

export type EmailProviderName = 'brevo' | 'none' | 'disabled'

export type EmailConfig = {
	provider: EmailProviderName
	from: string
	fromName?: string
	timeoutMs: number
	brevoApiKey: string
	brevoApiBaseUrl: string
	brevoSandbox: boolean
}

/** Config passed into BrevoService (subset of EmailConfig). */
export type BrevoEmailConfig = {
	apiKey: string
	apiBaseUrl: string
	from: string
	fromName?: string
	timeoutMs: number
	sandbox: boolean
}

const DEFAULT_BREVO_API_BASE_URL = 'https://api.brevo.com'
const DEFAULT_EMAIL_TIMEOUT_MS = 10_000
const DEFAULT_APP_BASE_URL = 'http://localhost:3000'
const EMAIL_PROVIDERS = new Set<string>(['brevo', 'none', 'disabled'])

/**
 * Rejects empty, example, or short JWT secrets. Does not log the value.
 */
export function assertJwtSecret(secret: string): void {
	const trimmed = secret.trim()

	if (!trimmed) {
		throw new Error('JWT_SECRET must not be empty')
	}

	if (trimmed === EXAMPLE_JWT_SECRET) {
		throw new Error('JWT_SECRET must not use the example placeholder; generate one with: openssl rand -base64 48')
	}

	if (trimmed.length < MIN_JWT_SECRET_LENGTH) {
		throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`)
	}
}

/**
 * Rejects unauthenticated Mongo URLs in production-like environments.
 */
export function assertDatabaseUrl(url: string, environment: string): void {
	const trimmed = url.trim()

	if (!trimmed) {
		throw new Error('DATABASE_URL must not be empty')
	}

	const env = environment.trim().toLowerCase()
	if (!isProductionEnvironment(environment)) {
		return
	}

	if (!DATABASE_URL_WITH_CREDENTIALS.test(trimmed)) {
		throw new Error('DATABASE_URL must include credentials (user:password@host) when ENVIRONMENT=prod')
	}

	const password = passwordFromDatabaseUrl(trimmed)
	if (password === EXAMPLE_MONGO_ROOT_PASSWORD) {
		throw new Error(
			'DATABASE_URL must not use the example Mongo password; generate one with: openssl rand -base64 24'
		)
	}

	const mongoRootPassword = process.env.MONGO_ROOT_PASSWORD?.trim()
	if (mongoRootPassword === EXAMPLE_MONGO_ROOT_PASSWORD) {
		throw new Error('MONGO_ROOT_PASSWORD must not use the example placeholder when ENVIRONMENT=prod')
	}
}

/**
 * Valida variáveis de ambiente obrigatórias na inicialização.
 */
export function validateEnv(): void {
	const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
	}

	assertJwtSecret(process.env.JWT_SECRET ?? '')
	assertDatabaseUrl(process.env.DATABASE_URL ?? '', process.env.ENVIRONMENT ?? '')
	assertEmailConfig(getEmailConfig())
}

export function getJwtSecret(): Uint8Array {
	const secret = process.env.JWT_SECRET
	if (secret === undefined) {
		throw new Error('Missing JWT_SECRET')
	}
	assertJwtSecret(secret)
	return new TextEncoder().encode(secret.trim())
}

export function getJwtIssuer(): string {
	const issuer = process.env.JWT_ISSUER?.trim()
	return issuer || DEFAULT_JWT_ISSUER
}

export function getJwtAudience(): string {
	const audience = process.env.JWT_AUDIENCE?.trim()
	return audience || DEFAULT_JWT_AUDIENCE
}

export function getJwtTtlSeconds(): number {
	return Number(process.env.JWT_TTL_SECONDS ?? 60 * 60 * 24 * 7)
}

export function getStorageConfig(): StorageConfig {
	const spacesEndpoint = process.env.SPACES_ENDPOINT ?? ''
	const spacesBucket = process.env.SPACES_BUCKET ?? ''
	const spacesAccessKeyId = process.env.SPACES_ACCESS_KEY_ID ?? ''
	const spacesSecretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY ?? ''
	const environment = process.env.ENVIRONMENT ?? 'dev'
	const spacesPublicBaseUrl = process.env.SPACES_PUBLIC_BASE_URL || `https://${spacesBucket}.${spacesEndpoint}`

	return {
		spacesEndpoint,
		spacesBucket,
		spacesAccessKeyId,
		spacesSecretAccessKey,
		spacesPublicBaseUrl,
		environment,
	}
}

function parseEmailProvider(raw: string | undefined): EmailProviderName {
	const value = (raw ?? '').trim().toLowerCase()
	if (!value) {
		return 'none'
	}
	if (!EMAIL_PROVIDERS.has(value)) {
		throw new Error(`EMAIL_PROVIDER must be one of: brevo, none, disabled (got "${raw}")`)
	}
	return value as EmailProviderName
}

function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
	if (raw === undefined || raw.trim() === '') {
		return fallback
	}
	const n = Number(raw)
	if (!Number.isFinite(n) || n <= 0) {
		throw new Error(`${name} must be a positive number`)
	}
	return Math.floor(n)
}

/**
 * Reads email provider config. Does not throw for incomplete brevo keys —
 * call {@link assertEmailConfig} at boot (via validateEnv) or before send.
 */
export function getEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig {
	const provider = parseEmailProvider(env.EMAIL_PROVIDER)
	const fromName = env.EMAIL_FROM_NAME?.trim()
	return {
		provider,
		from: env.EMAIL_FROM?.trim() ?? '',
		fromName: fromName || undefined,
		timeoutMs: parsePositiveInt(env.EMAIL_TIMEOUT_MS, DEFAULT_EMAIL_TIMEOUT_MS, 'EMAIL_TIMEOUT_MS'),
		brevoApiKey: env.BREVO_API_KEY?.trim() ?? '',
		brevoApiBaseUrl: env.BREVO_API_BASE_URL?.trim() || DEFAULT_BREVO_API_BASE_URL,
		brevoSandbox: env.BREVO_SANDBOX?.trim().toLowerCase() === 'true',
	}
}

/**
 * Enforces email env rules:
 * - production-like: EMAIL_PROVIDER cannot be none/disabled
 * - provider=brevo: EMAIL_FROM + BREVO_API_KEY required
 */
export function assertEmailConfig(config: EmailConfig, environment: string = process.env.ENVIRONMENT ?? ''): void {
	const productionLike = isProductionEnvironment(environment) || process.env.NODE_ENV === 'production'

	if (productionLike && (config.provider === 'none' || config.provider === 'disabled')) {
		throw new Error('EMAIL_PROVIDER=none|disabled is not allowed in production-like environments')
	}

	if (config.provider !== 'brevo') {
		return
	}

	if (!config.from) {
		throw new Error('EMAIL_FROM is required when EMAIL_PROVIDER=brevo')
	}
	if (!config.brevoApiKey) {
		throw new Error('BREVO_API_KEY is required when EMAIL_PROVIDER=brevo')
	}
}

export function getAppBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
	const raw = env.APP_BASE_URL?.trim() || DEFAULT_APP_BASE_URL
	return raw.replace(/\/$/, '')
}

const DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS = 10_000

export type GoogleOAuthConfig = {
	clientId: string
	clientSecret: string
	redirectUri: string
	timeoutMs: number
}

/**
 * Reads optional Google OAuth env. Incomplete config is allowed — readiness is false.
 * Invalid TIMEOUT_MS falls back to default (does not throw).
 */
export function getGoogleOAuthConfig(env: NodeJS.ProcessEnv = process.env): GoogleOAuthConfig {
	const rawTimeout = env.GOOGLE_OAUTH_TIMEOUT_MS?.trim()
	let timeoutMs = DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS
	if (rawTimeout) {
		const n = Number(rawTimeout)
		if (Number.isFinite(n) && n > 0) {
			timeoutMs = Math.floor(n)
		}
	}

	return {
		clientId: env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '',
		clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? '',
		redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? '',
		timeoutMs,
	}
}

/** True when Client ID, Secret and Redirect URI are all non-empty. */
export function isGoogleOAuthReady(config: GoogleOAuthConfig = getGoogleOAuthConfig()): boolean {
	return Boolean(config.clientId && config.clientSecret && config.redirectUri)
}

/**
 * Returns configured Google OAuth or throws. Use only on OAuth routes after readiness check.
 */
export function requireGoogleOAuthConfig(env: NodeJS.ProcessEnv = process.env): GoogleOAuthConfig {
	const config = getGoogleOAuthConfig(env)
	if (!isGoogleOAuthReady(config)) {
		throw new Error('Google OAuth is not configured')
	}
	return config
}
