'use client'

import * as React from 'react'
import NextLink from 'next/link'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Button } from '@/design-system/Button'
import { Title } from '@/design-system/Title'
import { useToast } from '@/design-system/Toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from '@/i18n/navigation'
import {
	listNotificationsRequest,
	markAllNotificationsReadRequest,
	markNotificationReadRequest,
	type NotificationItem,
} from '@/lib/notifications-client'
import { cn } from '@/lib/utils'

/** Lista de notificações in-app: mais recentes primeiro, paginada por "carregar mais". */
export function NotificationsPageClient() {
	const t = useTranslations('notifications')
	const format = useFormatter()
	const locale = useLocale()
	const router = useRouter()
	const { toast } = useToast()
	const { user, loading: authLoading } = useAuth()
	const [items, setItems] = React.useState<NotificationItem[]>([])
	const [unreadCount, setUnreadCount] = React.useState(0)
	const [nextCursor, setNextCursor] = React.useState<string | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [failed, setFailed] = React.useState(false)

	React.useEffect(() => {
		if (!authLoading && !user) {
			router.replace('/login')
		}
	}, [authLoading, user, router])

	const load = React.useCallback(async (cursor?: string) => {
		setLoading(true)
		setFailed(false)
		try {
			const page = await listNotificationsRequest({ cursor })
			setItems((current) => (cursor ? [...current, ...page.items] : page.items))
			setUnreadCount(page.unreadCount)
			setNextCursor(page.nextCursor)
		} catch {
			setFailed(true)
		} finally {
			setLoading(false)
		}
	}, [])

	React.useEffect(() => {
		if (user) void load()
	}, [user, load])

	const markRead = React.useCallback(
		async (item: NotificationItem) => {
			if (item.read) return
			setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)))
			setUnreadCount((count) => Math.max(0, count - 1))
			try {
				await markNotificationReadRequest(item.id)
			} catch {
				toast({ variant: 'error', title: t('loadError') })
				void load()
			}
		},
		[load, t, toast]
	)

	const markAllRead = React.useCallback(async () => {
		try {
			await markAllNotificationsReadRequest()
			setItems((current) => current.map((entry) => ({ ...entry, read: true })))
			setUnreadCount(0)
		} catch {
			toast({ variant: 'error', title: t('loadError') })
		}
	}, [t, toast])

	if (authLoading || !user) {
		return null
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6" data-testid="notifications-page">
			<div className="flex items-center justify-between gap-3">
				<Title as="h1">{t('title')}</Title>
				<Button type="button" variant="outline" disabled={unreadCount === 0} onClick={() => void markAllRead()}>
					{t('markAllRead')}
				</Button>
			</div>

			{failed ? <p className="text-sm text-destructive">{t('loadError')}</p> : null}
			{!failed && !loading && items.length === 0 ? (
				<p className="text-sm text-muted-foreground" data-testid="notifications-empty">
					{t('empty')}
				</p>
			) : null}

			<ul className="flex flex-col gap-2">
				{items.map((item) => (
					<li
						key={item.id}
						className={cn('rounded-md border border-border p-3', !item.read && 'bg-surface')}
						data-testid={`notification-${item.id}`}
						data-read={item.read}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className={cn('text-sm', !item.read && 'font-semibold')}>{item.title}</p>
								<p className="mt-1 text-sm break-words text-muted-foreground">{item.text}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{format.dateTime(new Date(item.createdAt), {
										dateStyle: 'medium',
										timeStyle: 'short',
									})}
								</p>
							</div>
							<div className="flex shrink-0 flex-col items-end gap-1">
								{item.link ? (
									<NextLink
										href={`/${locale}${item.link}`}
										className="text-sm underline-offset-4 hover:underline"
										onClick={() => void markRead(item)}
									>
										{t('open')}
									</NextLink>
								) : null}
								{!item.read ? (
									<button
										type="button"
										className="text-xs text-muted-foreground underline-offset-4 hover:underline"
										onClick={() => void markRead(item)}
									>
										{t('markRead')}
									</button>
								) : null}
							</div>
						</div>
					</li>
				))}
			</ul>

			{nextCursor ? (
				<Button type="button" variant="outline" disabled={loading} onClick={() => void load(nextCursor)}>
					{t('loadMore')}
				</Button>
			) : null}
		</div>
	)
}
