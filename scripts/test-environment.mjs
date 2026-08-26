import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

/**
 * Full environment validation for local/staging readiness.
 * Stricter than `npm run healthcheck`: requires live Brevo + Google OAuth probes.
 *
 * Usage: npm run test-environment
 */
const PASS = '✓'
const FAIL = '✗'

const EXAMPLE_JWT_SECRET = 'change-me-in-production-use-a-long-random-string'
const EXAMPLE_MONGO_ROOT_PASSWORD = 'change-me-generate-with-openssl-rand-base64-24'
const MIN_JWT_SECRET_LENGTH = 32
const DATABASE_URL_WITH_CREDENTIALS = /^mongodb(\+srv)?:\/\/[^/@\s]+:[^/@\s]+@/
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_OPENID_CONFIG = 'https://accounts.google.com/.well-known/openid-configuration'

const REQUIRED_ENV_VARS = [
	'DATABASE_URL',
	'CACHE_LIFETIME_SECONDS',
	'JWT_SECRET',
	'SPACES_ENDPOINT',
	'SPACES_BUCKET',
	'SPACES_ACCESS_KEY_ID',
	'SPACES_SECRET_ACCESS_KEY',
	'ENVIRONMENT',
]

/**
 * @typedef {{ name: string; ok: boolean; detail?: string }} CheckResult
 */

function passwordFromDatabaseUrl(url) {
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

function isProductionEnvironment(environment) {
	const env = (environment ?? '').trim().toLowerCase()
	return env === 'prod' || env === 'production'
}

/**
 * @param {Response} response
 */
async function safeReadBody(response) {
	try {
		return (await response.text()).trim()
	} catch {
		return ''
	}
}

/**
 * @returns {Promise<CheckResult>}
 */
async function checkEnv() {
	const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
	if (missing.length > 0) {
		return { name: 'environment', ok: false, detail: `missing: ${missing.join(', ')}` }
	}

	const cacheLifetime = Number(process.env.CACHE_LIFETIME_SECONDS)
	if (!Number.isFinite(cacheLifetime) || cacheLifetime <= 0) {
		return {
			name: 'environment',
			ok: false,
			detail: 'CACHE_LIFETIME_SECONDS must be a positive number',
		}
	}

	const environment = (process.env.ENVIRONMENT ?? '').trim().toLowerCase()
	const databaseUrl = (process.env.DATABASE_URL ?? '').trim()
	if (isProductionEnvironment(environment)) {
		if (!DATABASE_URL_WITH_CREDENTIALS.test(databaseUrl)) {
			return {
				name: 'environment',
				ok: false,
				detail: 'DATABASE_URL must include credentials in production-like ENVIRONMENT',
			}
		}
		const dbPassword = passwordFromDatabaseUrl(databaseUrl)
		if (dbPassword === EXAMPLE_MONGO_ROOT_PASSWORD) {
			return {
				name: 'environment',
				ok: false,
				detail: 'DATABASE_URL must not use the example Mongo password',
			}
		}
	}

	const serverPort = process.env.SERVER_PORT?.trim()
	if (serverPort) {
		const n = Number(serverPort)
		if (!Number.isInteger(n) || n < 1 || n > 65535) {
			return {
				name: 'environment',
				ok: false,
				detail: `SERVER_PORT must be an integer 1–65535 (got "${serverPort}")`,
			}
		}
	}

	return { name: 'environment', ok: true }
}

/**
 * @returns {Promise<CheckResult>}
 */
async function checkDatabase() {
	const prisma = new PrismaClient()
	try {
		await prisma.$runCommandRaw({ ping: 1 })
		return { name: 'database', ok: true }
	} catch (error) {
		return {
			name: 'database',
			ok: false,
			detail: error instanceof Error ? error.message : 'connection failed',
		}
	} finally {
		await prisma.$disconnect()
	}
}

/**
 * @returns {Promise<CheckResult>}
 */
async function checkSpaces() {
	const endpoint = process.env.SPACES_ENDPOINT?.trim()
	const bucket = process.env.SPACES_BUCKET?.trim()
	const accessKeyId = process.env.SPACES_ACCESS_KEY_ID?.trim()
	const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY?.trim()

	if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
		return { name: 'spaces', ok: false, detail: 'SPACES_* incomplete' }
	}

	const client = new S3Client({
		endpoint: `https://${endpoint}`,
		region: endpoint.split('.')[0] || 'us-east-1',
		credentials: { accessKeyId, secretAccessKey },
		forcePathStyle: false,
	})

	try {
		await client.send(new HeadBucketCommand({ Bucket: bucket }))
		return { name: 'spaces', ok: true }
	} catch (error) {
		return {
			name: 'spaces',
			ok: false,
			detail: error instanceof Error ? error.message : 'connection failed',
		}
	} finally {
		client.destroy()
	}
}

/**
 * @returns {Promise<CheckResult>}
 */
async function checkJwt() {
	const secret = process.env.JWT_SECRET
	const trimmed = secret?.trim() ?? ''
	if (!trimmed || trimmed === EXAMPLE_JWT_SECRET || trimmed.length < MIN_JWT_SECRET_LENGTH) {
		return {
			name: 'jwt',
			ok: false,
			detail: `JWT_SECRET must be a random string of at least ${MIN_JWT_SECRET_LENGTH} characters and must not be the example placeholder`,
		}
	}

	try {
		const { SignJWT, jwtVerify } = await import('jose')
		const key = new TextEncoder().encode(secret)
		const token = await new SignJWT({ testEnvironment: true })
			.setProtectedHeader({ alg: 'HS256' })
			.setExpirationTime('1m')
			.sign(key)
		await jwtVerify(token, key)
		return { name: 'jwt', ok: true }
	} catch (error) {
		return {
			name: 'jwt',
			ok: false,
			detail: error instanceof Error ? error.message : 'sign/verify failed',
		}
	}
}

/**
 * Live Brevo integration — requires EMAIL_PROVIDER=brevo and a working API key.
 * @returns {Promise<CheckResult>}
 */
async function checkBrevoIntegration() {
	const provider = (process.env.EMAIL_PROVIDER ?? '').trim().toLowerCase()
	if (provider !== 'brevo') {
		return {
			name: 'brevo',
			ok: false,
			detail: `EMAIL_PROVIDER must be "brevo" for test-environment (got "${provider || 'empty'}")`,
		}
	}

	const apiKey = process.env.BREVO_API_KEY?.trim()
	const from = process.env.EMAIL_FROM?.trim()
	if (!apiKey) {
		return { name: 'brevo', ok: false, detail: 'BREVO_API_KEY missing' }
	}
	if (!from) {
		return { name: 'brevo', ok: false, detail: 'EMAIL_FROM missing' }
	}

	const base = (process.env.BREVO_API_BASE_URL?.trim() || 'https://api.brevo.com').replace(/\/$/, '')
	const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS || 10_000)
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 10_000)

	try {
		const response = await fetch(`${base}/v3/account`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				'api-key': apiKey,
			},
			signal: controller.signal,
		})

		if (!response.ok) {
			const detail = await safeReadBody(response)
			return {
				name: 'brevo',
				ok: false,
				detail: `HTTP ${response.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`,
			}
		}

		const body = await response.json().catch(() => null)
		const email =
			body && typeof body === 'object' && body.email
				? String(body.email)
				: body && typeof body === 'object' && body.companyName
					? String(body.companyName)
					: 'account ok'
		return { name: 'brevo', ok: true, detail: `GET /v3/account ok (${email})` }
	} catch (error) {
		return {
			name: 'brevo',
			ok: false,
			detail: error instanceof Error ? error.message : 'connection failed',
		}
	} finally {
		clearTimeout(timer)
	}
}

/**
 * Live Google OAuth — OpenID discovery + token endpoint with dummy code.
 * Valid client_id/secret → typically invalid_grant; bad credentials → invalid_client.
 * @returns {Promise<CheckResult>}
 */
async function checkGoogleOAuthIntegration() {
	const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? ''
	const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? ''
	const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? ''
	const timeoutMs = Number(process.env.GOOGLE_OAUTH_TIMEOUT_MS || 10_000)
	const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10_000

	const missing = []
	if (!clientId) missing.push('GOOGLE_OAUTH_CLIENT_ID')
	if (!clientSecret) missing.push('GOOGLE_OAUTH_CLIENT_SECRET')
	if (!redirectUri) missing.push('GOOGLE_OAUTH_REDIRECT_URI')
	if (missing.length > 0) {
		return {
			name: 'googleOAuth',
			ok: false,
			detail: `missing: ${missing.join(', ')}`,
		}
	}

	const discoveryController = new AbortController()
	const discoveryTimer = setTimeout(() => discoveryController.abort(), timeout)
	try {
		const discovery = await fetch(GOOGLE_OPENID_CONFIG, {
			method: 'GET',
			signal: discoveryController.signal,
		})
		if (!discovery.ok) {
			return {
				name: 'googleOAuth',
				ok: false,
				detail: `OpenID discovery HTTP ${discovery.status}`,
			}
		}
		const doc = await discovery.json()
		if (!doc || typeof doc.token_endpoint !== 'string') {
			return {
				name: 'googleOAuth',
				ok: false,
				detail: 'OpenID discovery missing token_endpoint',
			}
		}
	} catch (error) {
		return {
			name: 'googleOAuth',
			ok: false,
			detail: error instanceof Error ? `discovery: ${error.message}` : 'discovery failed',
		}
	} finally {
		clearTimeout(discoveryTimer)
	}

	const tokenController = new AbortController()
	const tokenTimer = setTimeout(() => tokenController.abort(), timeout)
	try {
		const body = new URLSearchParams({
			code: 'app-test-environment-invalid-code',
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		})

		const response = await fetch(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body,
			signal: tokenController.signal,
		})

		const text = await safeReadBody(response)
		let errorCode = ''
		try {
			const json = JSON.parse(text)
			errorCode = typeof json.error === 'string' ? json.error : ''
		} catch {
			errorCode = ''
		}

		// Valid OAuth client typically rejects the fake code as invalid_grant.
		// Wrong client_id/secret → invalid_client. Mismatched redirect → redirect_uri_mismatch.
		if (errorCode === 'invalid_client') {
			return {
				name: 'googleOAuth',
				ok: false,
				detail: 'invalid_client — check GOOGLE_OAUTH_CLIENT_ID / CLIENT_SECRET',
			}
		}
		if (errorCode === 'redirect_uri_mismatch') {
			return {
				name: 'googleOAuth',
				ok: false,
				detail: 'redirect_uri_mismatch — GOOGLE_OAUTH_REDIRECT_URI must match Google Cloud Console',
			}
		}
		if (errorCode === 'invalid_grant' || errorCode === 'invalid_request') {
			return {
				name: 'googleOAuth',
				ok: true,
				detail: `credentials accepted by Google (${errorCode} on dummy code — expected)`,
			}
		}
		if (response.ok) {
			return {
				name: 'googleOAuth',
				ok: false,
				detail: 'unexpected success exchanging dummy code',
			}
		}

		return {
			name: 'googleOAuth',
			ok: false,
			detail: `unexpected token response HTTP ${response.status}${errorCode ? ` (${errorCode})` : ''}${text ? `: ${text.slice(0, 100)}` : ''}`,
		}
	} catch (error) {
		return {
			name: 'googleOAuth',
			ok: false,
			detail: error instanceof Error ? error.message : 'token probe failed',
		}
	} finally {
		clearTimeout(tokenTimer)
	}
}

/**
 * @param {CheckResult} result
 */
function printResult(result) {
	const symbol = result.ok ? PASS : FAIL
	const suffix = result.detail ? ` — ${result.detail}` : ''
	console.log(`${symbol} ${result.name}${suffix}`)
}

async function main() {
	console.log('App test-environment\n')

	const results = []
	for (const check of [
		checkEnv,
		checkDatabase,
		checkSpaces,
		checkJwt,
		checkBrevoIntegration,
		checkGoogleOAuthIntegration,
	]) {
		const result = await check()
		results.push(result)
		printResult(result)
	}

	const failed = results.filter((result) => !result.ok)
	console.log('')

	if (failed.length > 0) {
		console.log(`${FAIL} ${failed.length} dependência(s) com falha`)
		process.exitCode = 1
		return
	}

	console.log(`${PASS} ambiente ok (deps + Brevo + Google)`)
}

main().catch((error) => {
	console.error(`${FAIL} test-environment crashed`)
	console.error(error)
	process.exitCode = 1
})
