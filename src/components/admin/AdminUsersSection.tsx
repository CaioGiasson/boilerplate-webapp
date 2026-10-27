'use client'

import * as React from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { UsersRound } from 'lucide-react'
import { Badge } from '@/design-system/Badge'
import { DataTable, type DataTableColumn, type DataTableSort } from '@/design-system/DataTable'
import { EmptyState } from '@/design-system/EmptyState'
import { Icon } from '@/design-system/Icon'
import { IconButton } from '@/design-system/IconButton'
import { Pagination } from '@/design-system/Pagination'
import { SearchBar } from '@/design-system/SearchBar'
import { useToast } from '@/design-system/Toast'
import {
	createImpersonationTokenRequest,
	listAdminUsersRequest,
	type AdminUserRow,
	type AdminUsersPage,
} from '@/lib/auth-client'
import { IMPERSONATE_QUERY_PARAM } from '@/components/auth/ImpersonationConsumer'

const SEARCH_DEBOUNCE_MS = 300

export function buildImpersonationLink(origin: string, token: string): string {
	return `${origin}/?${IMPERSONATE_QUERY_PARAM}=${encodeURIComponent(token)}`
}

export function AdminUsersSection() {
	const t = useTranslations('admin')
	const format = useFormatter()
	const { toast } = useToast()
	const [searchInput, setSearchInput] = React.useState('')
	const [query, setQuery] = React.useState('')
	const [order, setOrder] = React.useState<'asc' | 'desc'>('desc')
	// Um cursor por página já visitada (a primeira é `undefined`): "Anterior" só desempilha.
	const [cursors, setCursors] = React.useState<Array<string | undefined>>([undefined])
	const [data, setData] = React.useState<AdminUsersPage | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [failed, setFailed] = React.useState(false)
	const [busyUserId, setBusyUserId] = React.useState<string | null>(null)

	const appliedQuery = React.useRef('')
	const cursor = cursors[cursors.length - 1]

	React.useEffect(() => {
		const timer = window.setTimeout(() => {
			const next = searchInput.trim()
			if (next === appliedQuery.current) return
			appliedQuery.current = next
			setQuery(next)
			setCursors([undefined])
		}, SEARCH_DEBOUNCE_MS)
		return () => window.clearTimeout(timer)
	}, [searchInput])

	React.useEffect(() => {
		let cancelled = false
		setLoading(true)
		setFailed(false)
		listAdminUsersRequest({ cursor, q: query || undefined, order })
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
	}, [cursor, query, order])

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

	const columns = React.useMemo<DataTableColumn<AdminUserRow>[]>(
		() => [
			{
				id: 'nickname',
				header: t('columnNickname'),
				cell: (item) => <span className="font-medium">{item.nickname}</span>,
			},
			{ id: 'email', header: t('columnEmail'), className: 'tabular-nums', cell: (item) => item.emailMasked },
			{
				id: 'role',
				header: t('columnRole'),
				cell: (item) => (
					<Badge variant={item.role === 'ADMIN' ? 'info' : 'neutral'}>
						{item.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}
					</Badge>
				),
			},
			{
				id: 'verified',
				header: t('columnVerified'),
				cell: (item) => (
					<Badge variant={item.emailVerified ? 'success' : 'warning'}>
						{item.emailVerified ? t('verifiedYes') : t('verifiedNo')}
					</Badge>
				),
			},
			{
				id: 'createdAt',
				header: t('columnCreated'),
				sortable: true,
				cell: (item) => format.dateTime(new Date(item.createdAt), { dateStyle: 'medium' }),
			},
			{
				id: 'actions',
				header: <span className="sr-only">{t('impersonate')}</span>,
				align: 'right',
				cell: (item) =>
					item.role === 'ADMIN' ? null : (
						<IconButton
							label={t('impersonate')}
							disabled={busyUserId === item.id}
							onClick={() => void copyImpersonationLink(item.id)}
						>
							<Icon icon={UsersRound} />
						</IconButton>
					),
			},
		],
		[t, format, busyUserId, copyImpersonationLink]
	)

	const onSortChange = (sort: DataTableSort) => {
		setOrder(sort.direction)
		setCursors([undefined])
	}

	if (failed) {
		return <p className="text-sm text-destructive">{t('loadError')}</p>
	}

	return (
		<section className="flex flex-col gap-4" aria-busy={loading} data-testid="admin-users">
			<h2 className="text-lg font-semibold">{t('usersTitle')}</h2>
			<p className="text-sm text-muted-foreground">{t('impersonateHint')}</p>

			<SearchBar
				value={searchInput}
				onValueChange={setSearchInput}
				label={t('searchLabel')}
				placeholder={t('searchPlaceholder')}
				data-testid="admin-users-search"
			/>

			<DataTable
				caption={t('tableCaption')}
				columns={columns}
				rows={data?.items ?? []}
				getRowId={(item) => item.id}
				loading={loading && !data}
				sort={{ columnId: 'createdAt', direction: order }}
				onSortChange={onSortChange}
				emptyState={<EmptyState title={query ? t('emptySearch') : t('empty')} />}
				data-testid="admin-users-table"
			/>

			<Pagination
				navLabel={t('paginationLabel')}
				previousLabel={t('previous')}
				nextLabel={t('next')}
				hasPrevious={cursors.length > 1}
				hasNext={Boolean(data?.pageInfo.hasNext)}
				disabled={loading}
				summary={t('pageNumber', { page: cursors.length })}
				onPrevious={() => setCursors((stack) => stack.slice(0, -1))}
				onNext={() => {
					const next = data?.pageInfo.nextCursor
					if (next) setCursors((stack) => [...stack, next])
				}}
			/>
		</section>
	)
}
