/**
 * @deprecated Prefer `npm run cron -- retention-purge`.
 * Kept as alias for PRIV-I03 / SEC-I01 docs that mention spaces:purge-orphans.
 */
import { parseCronArgs } from './cron/lib/args.mjs'
import { runRetentionPurge } from './cron/jobs/retention-purge.mjs'

runRetentionPurge(parseCronArgs())
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
