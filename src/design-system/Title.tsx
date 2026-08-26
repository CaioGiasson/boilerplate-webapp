import * as React from 'react'
import { cn } from '@/lib/utils'

export type TitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
	as?: 'h1' | 'h2' | 'h3' | 'h4'
}

export function Title({ as: Comp = 'h1', className, ...props }: TitleProps) {
	return (
		<Comp
			className={cn(
				'font-semibold tracking-tight text-foreground',
				Comp === 'h1' && 'text-3xl sm:text-4xl',
				Comp === 'h2' && 'text-2xl sm:text-3xl',
				Comp === 'h3' && 'text-xl',
				Comp === 'h4' && 'text-lg',
				className
			)}
			{...props}
		/>
	)
}
