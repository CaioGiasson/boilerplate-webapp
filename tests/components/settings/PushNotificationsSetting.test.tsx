/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { PushNotificationsSetting } from '@/components/settings/PushNotificationsSetting'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const toast = jest.fn()
const getPushSupport = jest.fn()
const fetchPushConfig = jest.fn()
const isPushSubscribed = jest.fn()
const enablePush = jest.fn()
const disablePush = jest.fn()
const sendTestPushRequest = jest.fn()
let currentUser: { impersonation: unknown } = { impersonation: null }

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
}))
jest.mock('@/design-system/Toast', () => ({ useToast: () => ({ toast }) }))
jest.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ user: currentUser }) }))
jest.mock('@/lib/push-client', () => ({
	getPushSupport: () => getPushSupport(),
	fetchPushConfig: () => fetchPushConfig(),
	isPushSubscribed: () => isPushSubscribed(),
	enablePush: () => enablePush(),
	disablePush: () => disablePush(),
	sendTestPushRequest: () => sendTestPushRequest(),
}))

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
		await Promise.resolve()
	})
}

describe('PushNotificationsSetting', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		currentUser = { impersonation: null }
		getPushSupport.mockReturnValue('supported')
		fetchPushConfig.mockResolvedValue({ enabled: true, publicKey: 'pub' })
		isPushSubscribed.mockResolvedValue(false)
		;(window as unknown as { Notification: unknown }).Notification = { permission: 'default' }
	})

	it('navegador sem suporte mostra o aviso e nenhum toggle', async () => {
		getPushSupport.mockReturnValue('unsupported')

		const { container, unmount } = renderInJsdom(<PushNotificationsSetting />)
		await flush()

		expect(container.querySelector('[data-testid="push-unavailable"]')?.textContent).toBe('unsupported')
		expect(container.querySelector('[data-testid="push-toggle"]')).toBeNull()
		unmount()
	})

	it('servidor sem VAPID explica que o push não está configurado', async () => {
		fetchPushConfig.mockResolvedValue({ enabled: false, publicKey: null })

		const { container, unmount } = renderInJsdom(<PushNotificationsSetting />)
		await flush()

		expect(container.querySelector('[data-testid="push-unavailable"]')?.textContent).toBe('notConfigured')
		unmount()
	})

	it('permissão bloqueada no navegador mostra como liberar', async () => {
		;(window as unknown as { Notification: unknown }).Notification = { permission: 'denied' }

		const { container, unmount } = renderInJsdom(<PushNotificationsSetting />)
		await flush()

		expect(container.querySelector('[data-testid="push-unavailable"]')?.textContent).toBe('denied')
		unmount()
	})

	it('ativar assina o aparelho e libera o botão de teste', async () => {
		enablePush.mockResolvedValue('enabled')
		const { container, unmount } = renderInJsdom(<PushNotificationsSetting />)
		await flush()

		await act(async () => {
			;(container.querySelector('[data-testid="push-toggle"]') as HTMLButtonElement).click()
		})
		await flush()

		expect(enablePush).toHaveBeenCalledTimes(1)
		expect(toast).toHaveBeenCalledWith({ variant: 'success', title: 'enabledToast' })
		expect(Array.from(container.querySelectorAll('button')).some((b) => b.textContent === 'sendTest')).toBe(true)
		unmount()
	})

	it('desativar cancela a assinatura', async () => {
		isPushSubscribed.mockResolvedValue(true)
		disablePush.mockResolvedValue(undefined)
		const { container, unmount } = renderInJsdom(<PushNotificationsSetting />)
		await flush()

		await act(async () => {
			;(container.querySelector('[data-testid="push-toggle"]') as HTMLButtonElement).click()
		})
		await flush()

		expect(disablePush).toHaveBeenCalledTimes(1)
		expect(toast).toHaveBeenCalledWith({ variant: 'success', title: 'disabledToast' })
		unmount()
	})

	it('falha ao ativar mostra erro e mantém desligado', async () => {
		enablePush.mockRejectedValue(new Error('boom'))
		const { container, unmount } = renderInJsdom(<PushNotificationsSetting />)
		await flush()

		await act(async () => {
			;(container.querySelector('[data-testid="push-toggle"]') as HTMLButtonElement).click()
		})
		await flush()

		expect(toast).toHaveBeenCalledWith({ variant: 'error', title: 'failed' })
		unmount()
	})

	it('durante o impersonamento o toggle fica desabilitado', async () => {
		currentUser = { impersonation: { expiresAt: '2026-10-26T12:10:00.000Z' } }

		const { container, unmount } = renderInJsdom(<PushNotificationsSetting />)
		await flush()

		expect((container.querySelector('[data-testid="push-toggle"]') as HTMLButtonElement).disabled).toBe(true)
		unmount()
	})
})
