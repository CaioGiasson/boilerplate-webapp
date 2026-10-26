import {
	clearFeatureFlagCache,
	FEATURE_FLAG_CACHE_TTL_MS,
	FEATURE_FLAGS,
	isFeatureActive,
} from '@/managers/FeatureFlag.manager'
import { mockPrismaRuntime } from '../helpers/mockDbCommander'

describe('isFeatureActive', () => {
	const findFirst = jest.fn()

	beforeEach(() => {
		clearFeatureFlagCache()
		findFirst.mockReset()
		mockPrismaRuntime({ featureFlag: { findFirst } })
	})

	it('trata flag ausente como desligada', async () => {
		findFirst.mockResolvedValue(null)

		await expect(isFeatureActive(FEATURE_FLAGS.AI_ENABLED)).resolves.toBe(false)
	})

	it('liga quando o registro mais recente é verdadeiro', async () => {
		findFirst.mockResolvedValue({ value: { enabled: true } })

		await expect(isFeatureActive(FEATURE_FLAGS.AI_ENABLED)).resolves.toBe(true)
	})

	it('serve do cache até o TTL e relê depois dele', async () => {
		findFirst.mockResolvedValueOnce({ value: true }).mockResolvedValueOnce({ value: false })
		const start = 1_000_000

		await expect(isFeatureActive('flag', start)).resolves.toBe(true)
		await expect(isFeatureActive('flag', start + FEATURE_FLAG_CACHE_TTL_MS - 1)).resolves.toBe(true)
		expect(findFirst).toHaveBeenCalledTimes(1)

		await expect(isFeatureActive('flag', start + FEATURE_FLAG_CACHE_TTL_MS)).resolves.toBe(false)
		expect(findFirst).toHaveBeenCalledTimes(2)
	})
})
