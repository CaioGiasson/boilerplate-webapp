'use client'

import * as React from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { Skeleton } from '@/design-system/Skeleton'
import { cn } from '@/lib/utils'

export type DataTableColumn<T> = {
	id: string
	header: React.ReactNode
	cell: (row: T) => React.ReactNode
	/** Cabeçalho vira botão que chama `onSortChange`. */
	sortable?: boolean
	align?: 'left' | 'center' | 'right'
	className?: string
}

export type DataTableSort = {
	columnId: string
	direction: 'asc' | 'desc'
}

export type DataTableProps<T> = {
	/** Descrição da tabela para leitores de tela (não aparece na tela). */
	caption: string
	columns: DataTableColumn<T>[]
	rows: T[]
	getRowId: (row: T) => string
	/** Mostra linhas de `Skeleton` no lugar dos dados. */
	loading?: boolean
	skeletonRows?: number
	/** Conteúdo (ex.: `EmptyState`) quando não há linhas e não está carregando. */
	emptyState?: React.ReactNode
	sort?: DataTableSort | null
	/** Recebe a ordenação pedida. A tabela não reordena: quem tem os dados (ou a API) ordena. */
	onSortChange?: (sort: DataTableSort) => void
	className?: string
	'data-testid'?: string
}

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

function nextSort(current: DataTableSort | null | undefined, columnId: string): DataTableSort {
	if (current?.columnId === columnId) {
		return { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
	}
	return { columnId, direction: 'asc' }
}

/**
 * Tabela de dados: cabeçalho opcionalmente ordenável (`aria-sort`), estado de carregamento e estado vazio.
 * Rola na horizontal em telas estreitas em vez de quebrar o layout.
 */
export function DataTable<T>({
	caption,
	columns,
	rows,
	getRowId,
	loading = false,
	skeletonRows = 5,
	emptyState,
	sort,
	onSortChange,
	className,
	'data-testid': testId,
}: DataTableProps<T>) {
	const showEmpty = !loading && rows.length === 0 && emptyState != null

	return (
		<div className={cn('w-full overflow-x-auto rounded-lg border border-border', className)} data-testid={testId}>
			<table className="w-full border-collapse text-sm" aria-busy={loading}>
				<caption className="sr-only">{caption}</caption>
				<thead className="bg-muted/50">
					<tr>
						{columns.map((column) => {
							const sorted = sort?.columnId === column.id ? sort.direction : null
							const align = ALIGN_CLASS[column.align ?? 'left']
							return (
								<th
									key={column.id}
									scope="col"
									className={cn(
										'px-3 py-2 font-medium text-muted-foreground',
										align,
										column.className
									)}
									aria-sort={
										column.sortable
											? sorted === 'asc'
												? 'ascending'
												: sorted === 'desc'
													? 'descending'
													: 'none'
											: undefined
									}
								>
									{column.sortable ? (
										<button
											type="button"
											className="inline-flex cursor-pointer items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
											onClick={() => onSortChange?.(nextSort(sort, column.id))}
										>
											{column.header}
											{sorted === 'asc' ? <ChevronUp className="size-3.5" aria-hidden /> : null}
											{sorted === 'desc' ? (
												<ChevronDown className="size-3.5" aria-hidden />
											) : null}
											{sorted === null ? (
												<ChevronsUpDown className="size-3.5 opacity-40" aria-hidden />
											) : null}
										</button>
									) : (
										column.header
									)}
								</th>
							)
						})}
					</tr>
				</thead>
				<tbody>
					{loading
						? Array.from({ length: skeletonRows }, (_, index) => (
								<tr key={`skeleton-${index}`} className="border-t border-border">
									{columns.map((column) => (
										<td key={column.id} className="px-3 py-2.5">
											<Skeleton className="h-4 w-full max-w-40" />
										</td>
									))}
								</tr>
							))
						: rows.map((row) => (
								<tr key={getRowId(row)} className="border-t border-border">
									{columns.map((column) => (
										<td
											key={column.id}
											className={cn(
												'px-3 py-2.5',
												ALIGN_CLASS[column.align ?? 'left'],
												column.className
											)}
										>
											{column.cell(row)}
										</td>
									))}
								</tr>
							))}
					{showEmpty ? (
						<tr className="border-t border-border">
							<td colSpan={columns.length}>{emptyState}</td>
						</tr>
					) : null}
				</tbody>
			</table>
		</div>
	)
}
