'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Tabs } from '@/design-system/Tabs'
import { Title } from '@/design-system/Title'
import { useAuth } from '@/components/auth/AuthProvider'
import { AdminAuditSection } from '@/components/admin/AdminAuditSection'
import { AdminUsersSection } from '@/components/admin/AdminUsersSection'

type AdminTab = 'users' | 'audit'

/**
 * Painel de administração. O controle de acesso real está nos use cases (`assertAdmin`); aqui a checagem de
 * papel só evita montar a tela e as chamadas para quem não é admin.
 */
export function AdminPageClient() {
	const t = useTranslations('admin')
	const { user, loading } = useAuth()
	const [tab, setTab] = React.useState<AdminTab>('users')

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
			<Title as="h1">{t('title')}</Title>
			{loading ? (
				<p className="text-sm text-muted-foreground">{t('loading')}</p>
			) : user?.role === 'ADMIN' && !user.impersonation ? (
				<Tabs
					label={t('tabsLabel')}
					value={tab}
					onValueChange={(id) => setTab(id as AdminTab)}
					items={[
						{ id: 'users', label: t('tabUsers') },
						{ id: 'audit', label: t('tabAudit') },
					]}
				>
					{tab === 'users' ? <AdminUsersSection /> : <AdminAuditSection />}
				</Tabs>
			) : (
				<p className="text-sm text-muted-foreground" data-testid="admin-access-denied">
					{t('accessDenied')}
				</p>
			)}
		</div>
	)
}
