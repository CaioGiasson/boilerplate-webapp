/**
 * @jest-environment jsdom
 */
import { ServiceWorkerRegistrar, SERVICE_WORKER_URL } from '@/components/pwa/ServiceWorkerRegistrar'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const register = jest.fn(async () => undefined)
const unregister = jest.fn()
const getRegistrations = jest.fn(async () => [{ unregister }])

describe('ServiceWorkerRegistrar', () => {
	const originalEnv = process.env.NODE_ENV

	beforeEach(() => {
		register.mockClear()
		unregister.mockClear()
		Object.defineProperty(window.navigator, 'serviceWorker', {
			value: { register, getRegistrations },
			configurable: true,
		})
	})

	afterEach(() => {
		;(process.env as Record<string, string | undefined>).NODE_ENV = originalEnv
	})

	it('em produção registra /sw.js com escopo raiz', () => {
		;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'

		const { unmount } = renderInJsdom(<ServiceWorkerRegistrar />)

		expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL, { scope: '/' })
		unmount()
	})

	it('fora de produção não registra e desregistra SW herdado', async () => {
		;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'

		const { unmount } = renderInJsdom(<ServiceWorkerRegistrar />)
		await Promise.resolve()
		await Promise.resolve()

		expect(register).not.toHaveBeenCalled()
		expect(unregister).toHaveBeenCalledTimes(1)
		unmount()
	})
})
