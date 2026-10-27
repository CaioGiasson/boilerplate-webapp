import * as React from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
	variant?: BadgeVariant
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
	neutral: 'bg-muted text-muted-foreground',
	success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
	warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
	danger: 'bg-red-500/15 text-red-700 dark:text-red-300',
	info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
}

/** Etiqueta curta de estado (papel, status). A cor reforça o texto; nunca é a única pista. */
export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
				VARIANT_CLASS[variant],
				className
			)}
			{...props}
		/>
	)
}
