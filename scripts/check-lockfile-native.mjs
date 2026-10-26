/**
 * Falha se o package-lock.json não lista os binários nativos de Linux x64 de que o build depende.
 * Roda no CI antes do `npm ci`; localmente: `npm run check:lockfile-native`.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { missingNativePackages } = require('./lib/lockfileNative.cjs')

const lockfilePath = resolve(dirname(fileURLToPath(import.meta.url)), '../package-lock.json')
const missing = missingNativePackages(JSON.parse(readFileSync(lockfilePath, 'utf8')))

if (missing.length > 0) {
	console.error('package-lock.json não lista binários nativos de Linux x64:')
	for (const name of missing) console.error(`  - ${name}`)
	console.error('Regenere o lockfile (npm install) ou veja docs/operators/ci.md.')
	process.exit(1)
}

console.log('package-lock.json lista os binários nativos de Linux x64.')
