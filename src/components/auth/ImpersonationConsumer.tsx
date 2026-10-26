'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/design-system/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { startImpersonationRequest } from '@/lib/auth-client'

export const IMPERSONATE_QUERY_PARAM = 'impersonate'

/**
 * Consome o link `?impersonate=<token>`: remove o token da URL na hora (histórico/referrer) e inicia a sessão.
 * Roda no cliente porque o middleware não tem Prisma (Edge) e gravar cookie num GET deixaria o prefetch abrir a sessão.
 */
export function ImpersonationConsumer() {
	const t = useTranslations('impersonation')
	const { toast } = useToast()
	const { refresh } = useAuth()
	const handled = React.useRef(false)

	React.useEffect(() => {
		if (handled.current) return
		const url = new URL(window.location.href)
		const token = url.searchParams.get(IMPERSONATE_QUERY_PARAM)
		if (!token) return
		handled.current = true

		url.searchParams.delete(IMPERSONATE_QUERY_PARAM)
		window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)

		void startImpersonationRequest(token)
			.then(() => refresh())
			.catch(() => toast({ variant: 'error', title: t('startFailed') }))
	}, [refresh, t, toast])

	return null
}
