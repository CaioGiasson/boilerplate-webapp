import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Load repo-root `.env` once for cron entrypoints. */
export function loadRepoEnv() {
	loadEnv({ path: resolve(__dirname, '../../../.env') })
}

/**
 * @param {string} name
 * @returns {string}
 */
export function requiredEnv(name) {
	const value = process.env[name]?.trim()
	if (!value) {
		console.error(`Missing ${name} in .env`)
		process.exit(1)
	}
	return value
}
