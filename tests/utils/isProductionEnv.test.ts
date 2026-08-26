import { isProductionEnv } from '@/utils/isProductionEnv'

describe('isProductionEnv', () => {
	it('recusa NODE_ENV=production mesmo com ENVIRONMENT=dev', () => {
		expect(isProductionEnv({ NODE_ENV: 'production', ENVIRONMENT: 'dev' })).toBe(true)
	})

	it('recusa ENVIRONMENT=prod mesmo com NODE_ENV=development', () => {
		expect(isProductionEnv({ NODE_ENV: 'development', ENVIRONMENT: 'prod' })).toBe(true)
	})

	it('permite desenvolvimento', () => {
		expect(isProductionEnv({ NODE_ENV: 'development', ENVIRONMENT: 'dev' })).toBe(false)
	})
})
