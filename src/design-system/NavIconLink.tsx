'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type NavIconLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
	tooltip: string
	label: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	asChild?: boolean
	children: React.ReactNode
}

/**
 * Ícone de navegação como link: sem fundo/hover; cinza claro apenas em :active.
 * Tooltip sem delay.
 */
export function NavIconLink({
	tooltip,
	label,
	side = 'right',
	asChild = false,
	className,
	children,
	...props
}: NavIconLinkProps) {
	const Comp = asChild ? Slot : 'a'

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Comp
						aria-label={label}
						className={cn(
							'inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground',
							'bg-transparent hover:bg-transparent',
							// light: muted cinza gelo; dark: border (mais claro que surface, senão some)
							'active:bg-muted dark:active:bg-border',
							'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
							'[&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0',
							className
						)}
						{...props}
					>
						{children}
					</Comp>
				</TooltipTrigger>
				<TooltipContent side={side}>{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
