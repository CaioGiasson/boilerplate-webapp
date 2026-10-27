'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/design-system/Button'
import { cn } from '@/lib/utils'

export type PaginationProps = {
	/** Rótulo da região de navegação (leitores de tela). */
	navLabel: string
	previousLabel: string
	nextLabel: string
	hasPrevious: boolean
	hasNext: boolean
	onPrevious: () => void
	onNext: () => void
	/** Texto central opcional (ex.: "Página 2"). */
	summary?: React.ReactNode
	/** Bloqueia os dois botões durante o carregamento. */
	disabled?: boolean
	className?: string
	'data-testid'?: string
}

/** Anterior/próxima: serve à paginação por cursor, que não sabe o total de páginas. */
export function Pagination({
	navLabel,
	previousLabel,
	nextLabel,
	hasPrevious,
	hasNext,
	onPrevious,
	onNext,
	summary,
	disabled,
	className,
	'data-testid': testId,
}: PaginationProps) {
	return (
		<nav
			className={cn('flex items-center justify-between gap-2', className)}
			aria-label={navLabel}
			data-testid={testId}
		>
			<Button type="button" variant="outline" size="sm" disabled={disabled || !hasPrevious} onClick={onPrevious}>
				<ChevronLeft aria-hidden />
				{previousLabel}
			</Button>
			{summary ? <span className="text-sm text-muted-foreground">{summary}</span> : null}
			<Button type="button" variant="outline" size="sm" disabled={disabled || !hasNext} onClick={onNext}>
				{nextLabel}
				<ChevronRight aria-hidden />
			</Button>
		</nav>
	)
}
