import { writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const secretsDir = resolve(__dirname, '../secrets')
const keyfilePath = resolve(secretsDir, 'mongo-keyfile')

if (existsSync(keyfilePath)) {
	const stat = statSync(keyfilePath)
	if (stat.isDirectory()) {
		console.error(
			'secrets/mongo-keyfile is a directory (often caused by docker compose up before generating the keyfile).'
		)
		console.error('Remove that directory, then run: npm run mongo:keyfile')
		process.exit(1)
	}

	console.log('secrets/mongo-keyfile already exists; not overwriting.')
	process.exit(0)
}

mkdirSync(secretsDir, { recursive: true })

// MongoDB keyfile: base64 characters only, 6–1024 bytes of content.
const content = `${randomBytes(756).toString('base64')}\n`
writeFileSync(keyfilePath, content, { mode: 0o400 })

console.log('Created secrets/mongo-keyfile (gitignored).')
