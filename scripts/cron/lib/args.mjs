/**
 * Shared CLI flags for cron jobs.
 * @param {string[]} [argv]
 */
export function parseCronArgs(argv = process.argv.slice(2)) {
	const dryRun = argv.includes('--dry-run')
	const confirm = argv.includes('--confirm')
	const job = argv.find((arg) => !arg.startsWith('-')) ?? null
	return { dryRun, confirm, job, argv }
}

/**
 * Most mutating jobs require an explicit --confirm (or --dry-run).
 * @param {{ dryRun: boolean, confirm: boolean }} flags
 * @param {string} example
 */
export function requireDryRunOrConfirm(flags, example) {
	if (flags.dryRun || flags.confirm) {
		return
	}
	console.error('Refusing to run without --confirm (or use --dry-run).')
	console.error(`Example: ${example}`)
	process.exit(1)
}
