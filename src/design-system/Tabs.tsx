'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type TabItem = {
	id: string
	label: string
	disabled?: boolean
}

export type TabsProps = {
	items: TabItem[]
	value: string
	onValueChange: (id: string) => void
	/** Rótulo da lista de abas (leitores de tela). */
	label: string
	/** Conteúdo da aba ativa. */
	children?: React.ReactNode
	className?: string
	'data-testid'?: string
}

function enabledIds(items: TabItem[]): string[] {
	return items.filter((item) => !item.disabled).map((item) => item.id)
}

/**
 * Abas controladas com ativação automática (padrão WAI-ARIA): setas ← →, Home e End movem o foco e
 * selecionam. Um único painel mostra o conteúdo da aba ativa; use `children` para trocar por aba.
 */
export function Tabs({ items, value, onValueChange, label, children, className, 'data-testid': testId }: TabsProps) {
	const baseId = React.useId()
	const tabRefs = React.useRef(new Map<string, HTMLButtonElement>())

	const select = (id: string) => {
		onValueChange(id)
		tabRefs.current.get(id)?.focus()
	}

	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		const ids = enabledIds(items)
		if (ids.length === 0) return
		const current = Math.max(0, ids.indexOf(value))
		let next: string | undefined
		if (event.key === 'ArrowRight') next = ids[(current + 1) % ids.length]
		else if (event.key === 'ArrowLeft') next = ids[(current - 1 + ids.length) % ids.length]
		else if (event.key === 'Home') next = ids[0]
		else if (event.key === 'End') next = ids[ids.length - 1]
		if (next === undefined) return
		event.preventDefault()
		select(next)
	}

	return (
		<div className={className} data-testid={testId}>
			<div
				role="tablist"
				aria-label={label}
				className="flex gap-1 overflow-x-auto border-b border-border"
				onKeyDown={onKeyDown}
			>
				{items.map((item) => {
					const selected = item.id === value
					return (
						<button
							key={item.id}
							ref={(node) => {
								if (node) tabRefs.current.set(item.id, node)
								else tabRefs.current.delete(item.id)
							}}
							type="button"
							role="tab"
							id={`${baseId}-tab-${item.id}`}
							aria-selected={selected}
							aria-controls={`${baseId}-panel`}
							tabIndex={selected ? 0 : -1}
							disabled={item.disabled}
							className={cn(
								'-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
								'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
								selected
									? 'border-primary text-foreground'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							)}
							onClick={() => onValueChange(item.id)}
						>
							{item.label}
						</button>
					)
				})}
			</div>
			<div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${value}`} className="pt-4">
				{children}
			</div>
		</div>
	)
}
