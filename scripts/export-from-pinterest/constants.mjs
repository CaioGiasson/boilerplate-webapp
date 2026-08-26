import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Repo root (`vitraux/`), two levels up from `scripts/export-from-pinterest/`. */
export const ROOT = resolve(__dirname, '../..')
export const COOKIES_PATH = resolve(ROOT, '.pinterest-cookies.json')
export const EXPORTS_ROOT = resolve(ROOT, 'exports')
export const DEFAULT_MAX_SCROLLS = 80
export const DEFAULT_STABLE_ROUNDS = 4
export const BOARD_DELAY_MS = 1000
export const DOWNLOAD_DELAY_MS = 1000
