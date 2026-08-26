/**
 * Age gate (PRIV-C06): birth dates are civil calendar dates in UTC (date-only).
 *
 * - Input is always `YYYY-MM-DD` (ISO date without time).
 * - Stored as `DateTime` at `00:00:00.000Z` for that calendar day.
 * - Age is computed by comparing UTC Y/M/D of “today” vs birth — never local timezone walls.
 * - Turning 18 on the UTC calendar day of the birthday is allowed (age >= 18).
 */

const BIRTH_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_BIRTH_YEAR = 1900
export const MINIMUM_AGE_YEARS = 18

export function isValidBirthDateString(value: string): boolean {
	const match = BIRTH_DATE_RE.exec(value)
	if (!match) return false
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (year < MIN_BIRTH_YEAR) return false
	if (month < 1 || month > 12) return false
	if (day < 1 || day > 31) return false
	const utc = Date.UTC(year, month - 1, day)
	const parsed = new Date(utc)
	return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

/** Parses `YYYY-MM-DD` into a Date at 00:00:00.000Z. */
export function parseBirthDateOnly(value: string): Date {
	if (!isValidBirthDateString(value)) {
		throw new Error('Invalid birth date')
	}
	const [, y, m, d] = BIRTH_DATE_RE.exec(value)!
	return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
}

export function formatBirthDateOnly(date: Date): string {
	const y = date.getUTCFullYear()
	const m = String(date.getUTCMonth() + 1).padStart(2, '0')
	const d = String(date.getUTCDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

/**
 * Whole years completed between birth (UTC date-only) and `now` (UTC calendar day).
 */
export function ageInYearsUtc(birthDate: Date, now: Date = new Date()): number {
	const by = birthDate.getUTCFullYear()
	const bm = birthDate.getUTCMonth()
	const bd = birthDate.getUTCDate()
	const ny = now.getUTCFullYear()
	const nm = now.getUTCMonth()
	const nd = now.getUTCDate()

	let age = ny - by
	if (nm < bm || (nm === bm && nd < bd)) {
		age -= 1
	}
	return age
}

export type BirthDateValidationFailure = 'invalid' | 'future' | 'underage'

export function validateAdultBirthDate(
	value: string,
	now: Date = new Date()
): { ok: true; date: Date } | { ok: false; reason: BirthDateValidationFailure } {
	if (!isValidBirthDateString(value)) {
		return { ok: false, reason: 'invalid' }
	}
	const date = parseBirthDateOnly(value)
	const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
	if (date.getTime() > todayUtc.getTime()) {
		return { ok: false, reason: 'future' }
	}
	if (ageInYearsUtc(date, now) < MINIMUM_AGE_YEARS) {
		return { ok: false, reason: 'underage' }
	}
	return { ok: true, date }
}
