import * as React from 'react'
import { listNotificationsRequest } from '@/lib/notifications-client'

export const UNREAD_POLL_MS = 60_000

/**
 * Contador do sino. Consulta ao montar, a cada minuto e ao voltar para a aba; só enquanto `enabled`
 * (logado, fora de aba oculta). Falha de rede mantém o último valor, sem tela de erro.
 */
export function useUnreadNotificationCount(enabled: boolean): { count: number; refresh: () => Promise<void> } {
	const [count, setCount] = React.useState(0)

	const refresh = React.useCallback(async () => {
		try {
			const page = await listNotificationsRequest({ limit: 1 })
			setCount(page.unreadCount)
		} catch {
			// Mantém o contador anterior.
		}
	}, [])

	React.useEffect(() => {
		if (!enabled) {
			setCount(0)
			return
		}

		void refresh()
		const intervalId = window.setInterval(() => {
			if (document.visibilityState === 'visible') void refresh()
		}, UNREAD_POLL_MS)
		const onVisible = () => {
			if (document.visibilityState === 'visible') void refresh()
		}
		document.addEventListener('visibilitychange', onVisible)

		return () => {
			window.clearInterval(intervalId)
			document.removeEventListener('visibilitychange', onVisible)
		}
	}, [enabled, refresh])

	return { count, refresh }
}
