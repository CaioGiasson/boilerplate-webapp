'use client'

import * as React from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { UsersRound } from 'lucide-react'
import { Button } from '@/design-system/Button'
import { Icon } from '@/design-system/Icon'
import { IconButton } from '@/design-system/IconButton'
import { useToast } from '@/design-system/Toast'
import { createImpersonationTokenRequest, listAdminUsersRequest, type AdminUsersPage } from '@/lib/auth-client'
import { IMPERSONATE_QUERY_PARAM } from '@/components/auth/ImpersonationConsumer'

export function buildImpersonationLink(origin: string, token: string): string {
	return `${origin}/?${IMPERSONATE_QUERY_PARAM}=${encodeURIComponent(token)}`
}

export function AdminUsersSection() {
	const t = useTranslations('admin')
	const format = useFormatter()
	const { toast } = useToast()
	const [page, setPage] = React.useState(1)
	const [data, setData] = React.useState<AdminUsersPage | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [failed, setFailed] = React.useState(false)
	const [busyUserId, setBusyUserId] = React.useState<string | null>(null)

	React.useEffect(() => {
		let cancelled = false
		setLoading(true)
		setFailed(false)
		listAdminUsersRequest(page)
			.then((result) => {
				if (!cancelled) setData(result)
			})
			.catch(() => {
				if (!cancelled) setFailed(true)
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [page])

	const copyImpersonationLink = React.useCallback(
		async (userId: string) => {
			setBusyUserId(userId)
			try {
				const { token } = await createImpersonationTokenRequest(userId)
				await navigator.clipboard.writeText(buildImpersonationLink(window.location.origin, token))
				toast({ variant: 'success', title: t('linkCopied') })
			} catch {
				toast({ variant: 'error', title: t('linkCopyFailed') })
			} finally {
				setBusyUserId(null)
			}
		},
		[t, toast]
	)

	if (failed) {
		return <p className="text-sm text-destructive">{t('loadError')}</p>
	}
	if (!data) {
		return <p className="text-sm text-muted-foreground">{t('loading')}</p>
	}

	const pages = Math.max(1, Math.ceil(data.total / data.pageSize))

	return (
		<section className="flex flex-col gap-4" aria-busy={loading} data-testid="admin-users">
			<h2 className="text-lg font-semibold">{t('usersTitle')}</h2>
			<p className="text-sm text-muted-foreground">{t('impersonateHint')}</p>

			{data.items.length === 0 ? (
				<p className="text-sm text-muted-foreground">{t('empty')}</p>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm">
						<thead className="bg-surface text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">{t('columnNickname')}</th>
								<th className="px-3 py-2 font-medium">{t('columnEmail')}</th>
								<th className="px-3 py-2 font-medium">{t('columnRole')}</th>
								<th className="px-3 py-2 font-medium">{t('columnVerified')}</th>
								<th className="px-3 py-2 font-medium">{t('columnCreated')}</th>
								<th className="px-3 py-2" />
							</tr>
						</thead>
						<tbody>
							{data.items.map((item) => (
								<tr
									key={item.id}
									className="border-t border-border"
									data-testid={`admin-user-${item.id}`}
								>
									<td className="px-3 py-2 font-medium">{item.nickname}</td>
									<td className="px-3 py-2 tabular-nums">{item.emailMasked}</td>
									<td className="px-3 py-2">
										{item.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}
									</td>
									<td className="px-3 py-2">
										{item.emailVerified ? t('verifiedYes') : t('verifiedNo')}
									</td>
									<td className="px-3 py-2">
										{format.dateTime(new Date(item.createdAt), { dateStyle: 'medium' })}
									</td>
									<td className="px-3 py-2 text-right">
										{item.role === 'ADMIN' ? null : (
											<IconButton
												label={t('impersonate')}
												disabled={busyUserId === item.id}
												onClick={() => void copyImpersonationLink(item.id)}
											>
												<Icon icon={UsersRound} />
											</IconButton>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<div className="flex items-center justify-between gap-3">
				<span className="text-sm text-muted-foreground">
					{t('pageSummary', { page: data.page, pages, total: data.total })}
				</span>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={page <= 1 || loading}
						onClick={() => setPage(page - 1)}
					>
						{t('previous')}
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={!data.hasMore || loading}
						onClick={() => setPage(page + 1)}
					>
						{t('next')}
					</Button>
				</div>
			</div>
		</section>
	)
}
