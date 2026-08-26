/**
 * @param {string} stage
 * @param {string} message
 */
export function logStep(stage, message) {
	const time = new Date().toLocaleTimeString('pt-BR', { hour12: false })
	console.log(`[${time}] [${stage}] ${message}`)
}

/**
 * Ends an in-progress progress line before printing a normal log.
 */
export function endProgressLine() {
	process.stdout.write('\n')
}

/**
 * @param {number} current
 * @param {number} total
 * @param {string} [label]
 */
export function renderProgressBar(current, total, label = '') {
	const width = 28
	const safeTotal = Math.max(total, 1)
	const ratio = Math.min(current / safeTotal, 1)
	const filled = Math.round(ratio * width)
	const bar = `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`
	const suffix = label ? ` ${label}` : ''
	process.stdout.write(`\r[${bar}] ${current}/${total}${suffix}`.padEnd(100))
	if (current >= total) {
		process.stdout.write('\n')
	}
}

/**
 * @param {number} ms
 */
export function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
}
