import * as React from 'react'
import { cn } from '@/lib/utils'

/** Bloco pulsante que ocupa o lugar do conteúdo que ainda carrega. Dê o tamanho por `className` (`h-4 w-32`). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden {...props} />
}
