'use client'

import * as React from 'react'
import { X } from 'lucide-react'

/**
 * Faixa contextual acima de um campo: conteúdo à esquerda e dispensar à direita.
 * Resposta e busca do chat da mesa usam esta mesma faixa, uma de cada vez.
 * Altura fixa, igual para resposta e busca: `HELPER_BAR_BLOCK_REM`.
 */
export const HELPER_BAR_BLOCK_REM = 2.375

export type HelperBarProps = {
	children: React.ReactNode
	dismissLabel: string
	onDismiss: () => void
	testId?: string
}

export function HelperBar({ children, dismissLabel, onDismiss, testId }: HelperBarProps) {
	return (
		<div
			className="flex h-[2.375rem] min-w-0 items-center gap-2 overflow-hidden rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground"
			data-testid={testId}
		>
			<div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
			<button
				type="button"
				className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label={dismissLabel}
				onClick={onDismiss}
			>
				<X className="size-3.5" aria-hidden />
			</button>
		</div>
	)
}
