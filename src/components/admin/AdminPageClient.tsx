'use client'

import { useTranslations } from 'next-intl'
import { Title } from '@/design-system/Title'
import { useAuth } from '@/components/auth/AuthProvider'
import { AdminUsersSection } from '@/components/admin/AdminUsersSection'

/**
 * Painel de administração. O controle de acesso real está nos use cases (`assertAdmin`); aqui a checagem de
 * papel só evita montar a tela e as chamadas para quem não é admin.
 */
export function AdminPageClient() {
	const t = useTranslations('admin')
	const { user, loading } = useAuth()

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
			<Title as="h1">{t('title')}</Title>
			{loading ? (
				<p className="text-sm text-muted-foreground">{t('loading')}</p>
			) : user?.role === 'ADMIN' && !user.impersonation ? (
				<AdminUsersSection />
			) : (
				<p className="text-sm text-muted-foreground" data-testid="admin-access-denied">
					{t('accessDenied')}
				</p>
			)}
		</div>
	)
}
