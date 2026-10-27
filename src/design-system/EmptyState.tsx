import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EmptyStateProps = {
	title: string
	description?: string
	icon?: LucideIcon
	/** Chamada para ação (ex.: botão "Criar o primeiro"). */
	action?: React.ReactNode
	className?: string
	'data-testid'?: string
}

/** Estado vazio de lista, tabela ou busca sem resultado: diz o que falta e o que fazer. */
export function EmptyState({
	title,
	description,
	icon: IconComponent,
	action,
	className,
	'data-testid': testId,
}: EmptyStateProps) {
	return (
		<div className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)} data-testid={testId}>
			{IconComponent ? <IconComponent className="size-8 text-muted-foreground" aria-hidden /> : null}
			<p className="text-sm font-medium">{title}</p>
			{description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	)
}
