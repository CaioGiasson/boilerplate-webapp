/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { ForceAppUpdate } from '@/components/pwa/ForceAppUpdate'
import { FORCE_UPDATE_RELOAD_DELAY_MS, VERSION_POLL_MS } from '@/lib/pwa/appUpdate'
import { renderInJsdom } from '../../helpers/renderInJsdom'

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
}))
jest.mock('@/constants/app', () => ({ APP_VERSION: '1.0.0' }))

const applyForcedUpdate = jest.fn(async () => undefined)
jest.mock('@/lib/pwa/appUpdate', () => ({
	...jest.requireActual('@/lib/pwa/appUpdate'),
	applyForcedUpdate: () => applyForcedUpdate(),
}))

function mockVersion(version: string) {
	global.fetch = jest.fn(async () => ({
		ok: true,
		json: async () => ({ success: true, data: { version } }),
	})) as unknown as typeof fetch
}

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
	})
}

describe('ForceAppUpdate', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		applyForcedUpdate.mockClear()
		;(document.activeElement as HTMLElement | null)?.blur()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('não faz nada quando a versão do servidor é igual', async () => {
		mockVersion('1.0.0')
		const { container, unmount } = renderInJsdom(<ForceAppUpdate />)
		await flush()

		expect(container.innerHTML).toBe('')
		act(() => {
			jest.advanceTimersByTime(FORCE_UPDATE_RELOAD_DELAY_MS * 2)
		})
		expect(applyForcedUpdate).not.toHaveBeenCalled()
		unmount()
	})

	it('mostra o aviso e recarrega quando a versão difere', async () => {
		mockVersion('1.1.0')
		const { container, unmount } = renderInJsdom(<ForceAppUpdate />)
		await flush()

		expect(container.querySelector('[data-testid="force-app-update"]')).not.toBeNull()
		expect(applyForcedUpdate).not.toHaveBeenCalled()
		act(() => {
			jest.advanceTimersByTime(FORCE_UPDATE_RELOAD_DELAY_MS)
		})
		expect(applyForcedUpdate).toHaveBeenCalledTimes(1)
		unmount()
	})

	it('adia o reload enquanto há um campo em foco e recarrega no check seguinte quando ele sai', async () => {
		mockVersion('1.1.0')
		const input = document.createElement('input')
		document.body.appendChild(input)
		input.focus()
		const { container, unmount } = renderInJsdom(<ForceAppUpdate />)
		await flush()

		expect(container.innerHTML).toBe('')
		act(() => {
			jest.advanceTimersByTime(FORCE_UPDATE_RELOAD_DELAY_MS * 2)
		})
		expect(applyForcedUpdate).not.toHaveBeenCalled()

		input.blur()
		await act(async () => {
			jest.advanceTimersByTime(VERSION_POLL_MS)
			await Promise.resolve()
			await Promise.resolve()
		})
		act(() => {
			jest.advanceTimersByTime(FORCE_UPDATE_RELOAD_DELAY_MS)
		})
		expect(applyForcedUpdate).toHaveBeenCalledTimes(1)
		input.remove()
		unmount()
	})

	it('ignora falha de rede e resposta inválida', async () => {
		global.fetch = jest.fn(async () => {
			throw new Error('offline')
		}) as unknown as typeof fetch
		const { container, unmount } = renderInJsdom(<ForceAppUpdate />)
		await flush()

		expect(container.innerHTML).toBe('')
		unmount()
	})
})
