/**
 * True when NODE_ENV or ENVIRONMENT indicates production.
 * Used by operator CLI scripts; refuse if either flag is production.
 */
export function isProductionEnv(env: { NODE_ENV?: string; ENVIRONMENT?: string } = process.env): boolean {
	const nodeEnv = env.NODE_ENV?.trim().toLowerCase()
	const environment = env.ENVIRONMENT?.trim().toLowerCase()

	return nodeEnv === 'production' || environment === 'prod' || environment === 'production'
}
