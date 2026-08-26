/**
 * Operator-local CLI (not a product feature). The Next.js app never reads
 * PINTEREST_COOKIES. Do not log cookie values.
 *
 * Thin entry — helpers live under `scripts/export-from-pinterest/`.
 */
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { ROOT } from './export-from-pinterest/constants.mjs'
import { main } from './export-from-pinterest/cli.mjs'

puppeteer.use(StealthPlugin())
loadEnv({ path: resolve(ROOT, '.env') })

main().catch((err) => {
	console.error(err)
	process.exitCode = 1
})
