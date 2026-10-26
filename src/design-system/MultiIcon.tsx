'use client'

import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MultiIconItem = {
	icon: LucideIcon
	/** Extra classes on the Lucide svg (e.g. rotate-45). */
	className?: string
}

export type MultiIconProps = Omit<LucideProps, 'ref'> & {
	icons: MultiIconItem[]
	/** Vertical stack (default) or horizontal row. */
	layout?: 'stack' | 'row'
}

/**
 * Composes two or more Lucide icons into a single visual mark (e.g. action-bar glyphs).
 */
export function MultiIcon({ icons, layout = 'stack', className, ...props }: MultiIconProps) {
	if (icons.length === 0) return null

	return (
		<span
			className={cn(
				'inline-flex items-center justify-center',
				layout === 'stack' ? 'flex-col gap-0' : 'flex-row gap-0',
				className
			)}
			aria-hidden
		>
			{icons.map((item, index) => {
				const IconComponent = item.icon
				return (
					<IconComponent
						key={index}
						className={cn('h-2.5 w-2.5 shrink-0', item.className)}
						aria-hidden
						{...props}
					/>
				)
			})}
		</span>
	)
}
