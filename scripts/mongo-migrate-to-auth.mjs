import { config as loadEnv } from 'dotenv'
import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const CONTAINER = 'mongo'
const username = process.env.MONGO_ROOT_USERNAME?.trim() || 'mongo'
const password = process.env.MONGO_ROOT_PASSWORD?.trim()

if (!password) {
	console.error('Set MONGO_ROOT_PASSWORD in .env before running this script.')
	process.exit(1)
}

const userScript = `
const admin = db.getSiblingDB('admin');
const username = ${JSON.stringify(username)};
const password = ${JSON.stringify(password)};
const existing = admin.getUser(username);
if (existing) {
  print('User "' + username + '" already exists in admin.');
  quit(0);
}
admin.createUser({
  user: username,
  pwd: password,
  roles: [{ role: 'root', db: 'admin' }],
});
print('Created admin user "' + username + '". Restart Mongo with auth enabled.');
`

const tempDir = mkdtempSync(join(tmpdir(), 'app-mongo-migrate-'))
const scriptPath = join(tempDir, 'create-admin.js')
writeFileSync(scriptPath, userScript.trim())

try {
	execSync(`docker cp "${scriptPath}" ${CONTAINER}:/tmp/create-admin.js`, { stdio: 'inherit' })
	execSync(`docker exec ${CONTAINER} mongosh --port 27017 --quiet --file /tmp/create-admin.js`, {
		stdio: 'inherit',
	})
	execSync(`docker exec ${CONTAINER} rm -f /tmp/create-admin.js`, { stdio: 'inherit' })
	console.log('\nMigration complete. Run: docker compose up -d --force-recreate')
} catch (error) {
	console.error('\nMigration failed. Is the container running without --auth?')
	console.error('See docs/mongo-auth-setup.md (section “Volume existente”).')
	process.exitCode = 1
} finally {
	unlinkSync(scriptPath)
}
