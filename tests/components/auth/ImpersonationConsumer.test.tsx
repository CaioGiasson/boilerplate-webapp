/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { ImpersonationConsumer } from '@/components/auth/ImpersonationConsumer'
import { renderInJsdom } from '../../helpers/renderInJsdom'

const refresh = jest.fn(async () => undefined)
const toast = jest.fn()
const startImpersonationRequest = jest.fn()

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
}))
jest.mock('@/design-system/Toast', () => ({
	useToast: () => ({ toast }),
}))
jest.mock('@/components/auth/AuthProvider', () => ({
	useAuth: () => ({ refresh }),
}))
jest.mock('@/lib/auth-client', () => ({
	startImpersonationRequest: (token: string) => startImpersonationRequest(token),
}))

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
	})
}

describe('ImpersonationConsumer', () => {
	beforeEach(() => {
		refresh.mockClear()
		toast.mockClear()
		startImpersonationRequest.mockReset()
	})

	it('consome o token, limpa a URL e atualiza a sessão', async () => {
		window.history.replaceState(null, '', '/pt?impersonate=tok-123&x=1')
		startImpersonationRequest.mockResolvedValue({ expiresAt: '2026-10-26T12:10:00.000Z' })

		const { unmount } = renderInJsdom(<ImpersonationConsumer />)
		await flush()

		expect(startImpersonationRequest).toHaveBeenCalledWith('tok-123')
		expect(window.location.search).toBe('?x=1')
		expect(refresh).toHaveBeenCalledTimes(1)
		expect(toast).not.toHaveBeenCalled()
		unmount()
	})

	it('avisa com toast de erro quando o servidor recusa', async () => {
		window.history.replaceState(null, '', '/pt?impersonate=bad')
		startImpersonationRequest.mockRejectedValue(new Error('401'))

		const { unmount } = renderInJsdom(<ImpersonationConsumer />)
		await flush()

		expect(toast).toHaveBeenCalledWith({ variant: 'error', title: 'startFailed' })
		expect(refresh).not.toHaveBeenCalled()
		unmount()
	})

	it('não faz nada sem o parâmetro na URL', async () => {
		window.history.replaceState(null, '', '/pt')

		const { unmount } = renderInJsdom(<ImpersonationConsumer />)
		await flush()

		expect(startImpersonationRequest).not.toHaveBeenCalled()
		unmount()
	})
})
