/** Quarantine window before hard delete (cron). */
export const ACCOUNT_DELETION_QUARANTINE_DAYS = 30

export const ACCOUNT_DELETION_QUARANTINE_MS = ACCOUNT_DELETION_QUARANTINE_DAYS * 24 * 60 * 60 * 1000

export function accountDeletionDeadline(deletedAt: Date): Date {
	return new Date(deletedAt.getTime() + ACCOUNT_DELETION_QUARANTINE_MS)
}

/** True while the account can still be restored via CANCELAR. */
export function isWithinAccountDeletionQuarantine(deletedAt: Date, now: Date = new Date()): boolean {
	return now.getTime() < accountDeletionDeadline(deletedAt).getTime()
}
