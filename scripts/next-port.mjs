/**
 * Spawns Next.js with `-p` from SERVER_PORT (env or .env), default 3000.
 * Usage: node scripts/next-port.mjs dev | start
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_PORT = '3000'

function readServerPortFromDotEnv() {
	const envPath = resolve(process.cwd(), '.env')
	if (!existsSync(envPath)) {
		return undefined
	}
	for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) {
			continue
		}
		const match = trimmed.match(/^SERVER_PORT\s*=\s*(.*)$/)
		if (!match) {
			continue
		}
		let value = match[1].trim()
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1)
		}
		return value.trim() || undefined
	}
	return undefined
}

function resolvePort() {
	const fromEnv = process.env.SERVER_PORT?.trim()
	if (fromEnv) {
		return fromEnv
	}
	return readServerPortFromDotEnv() ?? DEFAULT_PORT
}

function assertPort(port) {
	const n = Number(port)
	if (!Number.isInteger(n) || n < 1 || n > 65535) {
		console.error(`SERVER_PORT must be an integer 1–65535 (got "${port}")`)
		process.exit(1)
	}
}

const mode = process.argv[2]
if (mode !== 'dev' && mode !== 'start') {
	console.error('Usage: node scripts/next-port.mjs <dev|start>')
	process.exit(1)
}

const port = resolvePort()
assertPort(port)

const nextArgs = mode === 'dev' ? ['dev', '--turbopack', '-p', port] : ['start', '-p', port]

const child = spawn('npx', ['next', ...nextArgs], {
	stdio: 'inherit',
	shell: true,
	env: {
		...process.env,
		SERVER_PORT: port,
		PORT: port,
	},
})

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal)
		return
	}
	process.exit(code ?? 1)
})
