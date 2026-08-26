/**
 * Cron job dispatcher.
 *
 * Uso:
 *   npm run cron -- list
 *   npm run cron -- retention-purge --dry-run
 *   npm run cron -- retention-purge --confirm
 *
 * Agendamento (host):
 *   0 3 * * * cd /path/to/boilerplate-webapp && npm run cron -- retention-purge --confirm >> /var/log/app-cron.log 2>&1
 *
 * Ver também: docs/operators/cron.md e deploy/cron/cronjob-retention-purge.yaml
 */
import { parseCronArgs } from './lib/args.mjs'
import { runRetentionPurge } from './jobs/retention-purge.mjs'

/** @type {Record<string, (flags: ReturnType<typeof parseCronArgs>) => Promise<unknown>>} */
const JOBS = {
	'retention-purge': runRetentionPurge,
}

function printHelp() {
	console.log(`Available jobs:
  ${Object.keys(JOBS).join('\n  ')}

Examples:
  npm run cron -- list
  npm run cron -- retention-purge --dry-run
  npm run cron -- retention-purge --confirm
`)
}

async function main() {
	const flags = parseCronArgs()
	const name = flags.job

	if (!name || name === 'list' || name === 'help' || name === '--help') {
		printHelp()
		process.exit(name && name !== 'list' && name !== 'help' && name !== '--help' ? 1 : 0)
	}

	const job = JOBS[name]
	if (!job) {
		console.error(`Unknown job: ${name}`)
		printHelp()
		process.exit(1)
	}

	console.log(`[cron] starting job=${name} dryRun=${flags.dryRun} confirm=${flags.confirm}`)
	await job(flags)
	console.log(`[cron] finished job=${name}`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
