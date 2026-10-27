'use client'

import * as React from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { DataTable, type DataTableColumn, type DataTableSort } from '@/design-system/DataTable'
import { EmptyState } from '@/design-system/EmptyState'
import { Pagination } from '@/design-system/Pagination'
import { AppSelect } from '@/design-system/Select'
import { AUDIT_ACTIONS } from '@/constants/audit'
import { listAdminAuditEventsRequest, type AdminAuditEventRow, type AdminAuditEventsPage } from '@/lib/auth-client'

const ALL_ACTIONS = 'all'

/** `admin.impersonation_token_created` → `admin_impersonation_token_created` (chave de catálogo sem ponto). */
function actionKey(action: string): string {
	return action.split('.').join('_')
}

export function AdminAuditSection() {
	const t = useTranslations('admin')
	const format = useFormatter()
	const [action, setAction] = React.useState(ALL_ACTIONS)
	const [order, setOrder] = React.useState<'asc' | 'desc'>('desc')
	// Um cursor por página já visitada (a primeira é `undefined`): "Anterior" só desempilha.
	const [cursors, setCursors] = React.useState<Array<string | undefined>>([undefined])
	const [data, setData] = React.useState<AdminAuditEventsPage | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [failed, setFailed] = React.useState(false)

	const cursor = cursors[cursors.length - 1]

	React.useEffect(() => {
		let cancelled = false
		setLoading(true)
		setFailed(false)
		listAdminAuditEventsRequest({ cursor, action: action === ALL_ACTIONS ? undefined : action, order })
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
	}, [cursor, action, order])

	const actionOptions = React.useMemo(
		() => [
			{ value: ALL_ACTIONS, label: t('auditFilterAll') },
			...AUDIT_ACTIONS.map((value) => ({ value, label: t(`auditActions.${actionKey(value)}` as never) })),
		],
		[t]
	)

	const columns = React.useMemo<DataTableColumn<AdminAuditEventRow>[]>(() => {
		const actorLabel = (item: AdminAuditEventRow) => {
			if (item.actor) return item.actor.nickname ?? t('auditDeletedAccount')
			return item.actorType === 'operator' ? t('auditActorOperator') : t('auditActorSystem')
		}
		return [
			{
				id: 'createdAt',
				header: t('auditColumnWhen'),
				sortable: true,
				className: 'whitespace-nowrap',
				cell: (item) => format.dateTime(new Date(item.createdAt), { dateStyle: 'medium', timeStyle: 'short' }),
			},
			{
				id: 'action',
				header: t('auditColumnAction'),
				cell: (item) => t(`auditActions.${actionKey(item.action)}` as never),
			},
			{ id: 'actor', header: t('auditColumnActor'), cell: actorLabel },
			{
				id: 'target',
				header: t('auditColumnTarget'),
				cell: (item) => (item.target ? (item.target.nickname ?? t('auditDeletedAccount')) : null),
			},
		]
	}, [t, format])

	if (failed) {
		return <p className="text-sm text-destructive">{t('auditLoadError')}</p>
	}

	return (
		<section className="flex flex-col gap-4" aria-busy={loading} data-testid="admin-audit">
			<h2 className="text-lg font-semibold">{t('auditTitle')}</h2>
			<p className="text-sm text-muted-foreground">{t('auditHint')}</p>

			<div className="max-w-sm">
				<AppSelect
					value={action}
					options={actionOptions}
					aria-label={t('auditFilterLabel')}
					onValueChange={(value) => {
						setAction(value)
						setCursors([undefined])
					}}
				/>
			</div>

			<DataTable
				caption={t('auditTitle')}
				columns={columns}
				rows={data?.items ?? []}
				getRowId={(item) => item.id}
				loading={loading && !data}
				sort={{ columnId: 'createdAt', direction: order }}
				onSortChange={(sort: DataTableSort) => {
					setOrder(sort.direction)
					setCursors([undefined])
				}}
				emptyState={<EmptyState title={t('auditEmpty')} />}
				data-testid="admin-audit-table"
			/>

			<Pagination
				navLabel={t('auditPaginationLabel')}
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
