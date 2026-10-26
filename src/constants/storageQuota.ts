/** Per-user published object cap (avatars + gallery). Billing alerts stay out of scope. */
export const USER_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024

export const STORAGE_WARN_PERCENT = 60
export const STORAGE_CRITICAL_PERCENT = 90

export type StorageProgressTone = 'ok' | 'warn' | 'critical'

/** < 60 % ok, ≥ 60 % warn, > 90 % critical. */
export function storageProgressTone(percentUsed: number): StorageProgressTone {
	if (percentUsed > STORAGE_CRITICAL_PERCENT) return 'critical'
	if (percentUsed >= STORAGE_WARN_PERCENT) return 'warn'
	return 'ok'
}

export function storagePercentUsed(usedBytes: number, quotaBytes: number = USER_STORAGE_QUOTA_BYTES): number {
	if (quotaBytes <= 0) return 0
	return Math.max(0, Math.min(100, (usedBytes / quotaBytes) * 100))
}
