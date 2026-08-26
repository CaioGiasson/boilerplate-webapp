import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

/**
 * CLI probe of env/Mongo/Spaces/JWT/Brevo (Prisma ping + S3 HeadBucket + Brevo account API).
 * HTTP `/api/health*` is loopback-only unless HEALTHCHECK_TOKEN is set.
 */
const PASS = '✓'
const FAIL = '✗'

const EXAMPLE_JWT_SECRET = 'change-me-in-production-use-a-long-random-string'
const EXAMPLE_MONGO_ROOT_PASSWORD = 'change-me-generate-with-openssl-rand-base64-24'
const MIN_JWT_SECRET_LENGTH = 32
const DATABASE_URL_WITH_CREDENTIALS = /^mongodb(\+srv)?:\/\/[^/@\s]+:[^/@\s]+@/

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

/**
 * @returns {Promise<CheckResult>}
 */
async function checkEnv() {
	const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
	if (missing.length > 0) {
		return {
			name: 'environment',
			ok: false,
			detail: `missing: ${missing.join(', ')}`,
		}
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
				detail: 'DATABASE_URL must include credentials when ENVIRONMENT=prod',
			}
		}

		const password = passwordFromDatabaseUrl(databaseUrl)
		if (password === EXAMPLE_MONGO_ROOT_PASSWORD) {
			return {
				name: 'environment',
				ok: false,
				detail: 'DATABASE_URL must not use the example Mongo password when ENVIRONMENT=prod',
			}
		}

		const mongoRootPassword = process.env.MONGO_ROOT_PASSWORD?.trim()
		if (mongoRootPassword === EXAMPLE_MONGO_ROOT_PASSWORD) {
			return {
				name: 'environment',
				ok: false,
				detail: 'MONGO_ROOT_PASSWORD must not use the example placeholder when ENVIRONMENT=prod',
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
	const endpoint = process.env.SPACES_ENDPOINT
	const bucket = process.env.SPACES_BUCKET
	const accessKeyId = process.env.SPACES_ACCESS_KEY_ID
	const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY

	if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
		return {
			name: 'spaces',
			ok: false,
			detail: 'SPACES_* environment variables are incomplete',
		}
	}

	const client = new S3Client({
		endpoint: `https://${endpoint}`,
		region: 'us-east-1',
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
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
async function checkBrevo() {
	const provider = (process.env.EMAIL_PROVIDER ?? 'none').trim().toLowerCase()

	if (!provider || provider === 'none' || provider === 'disabled') {
		return {
			name: 'brevo',
			ok: true,
			detail: `skipped (EMAIL_PROVIDER=${provider || 'none'})`,
		}
	}

	if (provider !== 'brevo') {
		return {
			name: 'brevo',
			ok: false,
			detail: `unsupported EMAIL_PROVIDER=${provider}`,
		}
	}

	const apiKey = process.env.BREVO_API_KEY?.trim()
	const from = process.env.EMAIL_FROM?.trim()
	if (!apiKey) {
		return { name: 'brevo', ok: false, detail: 'BREVO_API_KEY missing when EMAIL_PROVIDER=brevo' }
	}
	if (!from) {
		return { name: 'brevo', ok: false, detail: 'EMAIL_FROM missing when EMAIL_PROVIDER=brevo' }
	}

	const base = (process.env.BREVO_API_BASE_URL?.trim() || 'https://api.brevo.com').replace(/\/$/, '')
	const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS || 10_000)
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)

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

		return { name: 'brevo', ok: true }
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
		const token = await new SignJWT({ healthcheck: true })
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
 * @returns {Promise<CheckResult>}
 */
async function checkGoogleOAuth() {
	const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? ''
	const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? ''
	const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? ''
	const anySet = Boolean(clientId || clientSecret || redirectUri)

	if (!anySet) {
		return {
			name: 'googleOAuth',
			ok: true,
			detail: 'skipped (not configured — Continuar com Google hidden)',
		}
	}

	const missing = []
	if (!clientId) missing.push('GOOGLE_OAUTH_CLIENT_ID')
	if (!clientSecret) missing.push('GOOGLE_OAUTH_CLIENT_SECRET')
	if (!redirectUri) missing.push('GOOGLE_OAUTH_REDIRECT_URI')

	if (missing.length > 0) {
		return {
			name: 'googleOAuth',
			ok: false,
			detail: `incomplete config: missing ${missing.join(', ')}`,
		}
	}

	return { name: 'googleOAuth', ok: true }
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
	console.log('Vitraux healthcheck\n')

	const results = []
	for (const check of [checkEnv, checkDatabase, checkSpaces, checkJwt, checkBrevo, checkGoogleOAuth]) {
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

	console.log(`${PASS} todas as dependências ok`)
}

main().catch((error) => {
	console.error(`${FAIL} healthcheck crashed`)
	console.error(error)
	process.exitCode = 1
})
