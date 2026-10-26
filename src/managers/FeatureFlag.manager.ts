import { runWithoutTransaction } from '@/managers/Db.manager'
import FeatureFlagRepository from '@/repositories/FeatureFlag.repository'
import { jsonValueToBoolean } from '@/utils/jsonValueToBoolean'

export const FEATURE_FLAGS = {
	AI_ENABLED: 'ai_enabled',
} as const

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]

/** Tempo máximo que uma instância pode servir o valor em cache antes de reler o banco. */
export const FEATURE_FLAG_CACHE_TTL_MS = 30_000

type CacheEntry = { value: boolean; expiresAt: number }

const cache = new Map<string, CacheEntry>()

/** Flag ausente conta como desligada. Em multi-instância a propagação leva até `FEATURE_FLAG_CACHE_TTL_MS`. */
export async function isFeatureActive(key: string, now: number = Date.now()): Promise<boolean> {
	const cached = cache.get(key)
	if (cached && cached.expiresAt > now) {
		return cached.value
	}

	const raw = await runWithoutTransaction((client) => new FeatureFlagRepository(client).findLatestValue(key))
	const value = jsonValueToBoolean(raw)
	cache.set(key, { value, expiresAt: now + FEATURE_FLAG_CACHE_TTL_MS })

	return value
}

export function clearFeatureFlagCache(): void {
	cache.clear()
}
