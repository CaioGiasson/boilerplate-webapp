const TRUTHY_STRINGS = new Set(['true', '1'])
const OBJECT_VALUE_FIELDS = ['active', 'enabled', 'value'] as const

/** Interpreta o valor Json de uma feature flag como booleano; ausente ou desconhecido conta como desligado. */
export function jsonValueToBoolean(value: unknown): boolean {
	if (value === null || value === undefined) return false
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value !== 0
	if (typeof value === 'string') return TRUTHY_STRINGS.has(value.trim().toLowerCase())
	if (typeof value === 'object' && !Array.isArray(value)) {
		const record = value as Record<string, unknown>
		const field = OBJECT_VALUE_FIELDS.find((name) => name in record)
		return field ? jsonValueToBoolean(record[field]) : false
	}

	return false
}
