import { USER_STORAGE_QUOTA_BYTES, storagePercentUsed, storageProgressTone } from '@/constants/storageQuota'

describe('storageProgressTone', () => {
	it.each([
		[0, 'ok'],
		[59.99, 'ok'],
		[60, 'warn'],
		[90, 'warn'],
		[90.01, 'critical'],
		[100, 'critical'],
	])('%s%% -> %s', (percent, expected) => {
		expect(storageProgressTone(percent)).toBe(expected)
	})
})

describe('storagePercentUsed', () => {
	it('calcula a fração da cota padrão e limita a 0–100', () => {
		expect(storagePercentUsed(USER_STORAGE_QUOTA_BYTES / 4)).toBe(25)
		expect(storagePercentUsed(USER_STORAGE_QUOTA_BYTES * 2)).toBe(100)
		expect(storagePercentUsed(-1)).toBe(0)
	})

	it('usa a cota informada e tolera cota inválida', () => {
		expect(storagePercentUsed(50, 200)).toBe(25)
		expect(storagePercentUsed(50, 0)).toBe(0)
	})
})
