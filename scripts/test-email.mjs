/**
 * Smoke send via Brevo Transactional API.
 * Usage: npm run test-email -- recipient@example.com
 * Requires BREVO_API_KEY and EMAIL_FROM in .env (sender must be verified in Brevo).
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { refuseIfProduction } from './lib/operator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

refuseIfProduction()

const SUBJECT = 'Hello World'
const TEXT = 'Teste de envio de e-mail'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function main() {
	const to = process.argv[2]?.trim()
	if (!to || !EMAIL_PATTERN.test(to)) {
		console.error('Usage: npm run test-email -- recipient@example.com')
		process.exit(1)
	}

	const from = process.env.EMAIL_FROM?.trim()
	if (!from) {
		console.error('EMAIL_FROM is required in .env')
		process.exit(1)
	}

	const apiKey = process.env.BREVO_API_KEY?.trim()
	if (!apiKey) {
		console.error('BREVO_API_KEY is required in .env')
		process.exit(1)
	}

	const fromName = process.env.EMAIL_FROM_NAME?.trim() || undefined
	const base = (process.env.BREVO_API_BASE_URL?.trim() || 'https://api.brevo.com').replace(/\/$/, '')
	const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS || 10_000)
	const sandbox = process.env.BREVO_SANDBOX?.trim().toLowerCase() === 'true'

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)

	const body = {
		sender: {
			email: from,
			...(fromName ? { name: fromName } : {}),
		},
		to: [{ email: to }],
		subject: SUBJECT,
		textContent: TEXT,
	}
	if (sandbox) {
		body.headers = { 'X-Sib-Sandbox': 'drop' }
	}

	try {
		const response = await fetch(`${base}/v3/smtp/email`, {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
				'api-key': apiKey,
			},
			body: JSON.stringify(body),
			signal: controller.signal,
		})

		const raw = await response.text()
		if (!response.ok) {
			console.error(`Brevo error ${response.status}: ${raw.slice(0, 500)}`)
			process.exit(1)
		}

		let messageId = ''
		try {
			messageId = JSON.parse(raw)?.messageId ?? ''
		} catch {
			/* ignore */
		}

		console.log(`Sent "${SUBJECT}" to ${to} from ${from}${sandbox ? ' (sandbox drop)' : ''}`)
		if (messageId) {
			console.log(`messageId: ${messageId}`)
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : error)
		process.exit(1)
	} finally {
		clearTimeout(timer)
	}
}

main()
