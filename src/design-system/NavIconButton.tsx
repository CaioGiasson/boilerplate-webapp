'use client'

import * as React from 'react'
import { IconButton, type IconButtonProps } from '@/design-system/IconButton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type NavIconButtonProps = IconButtonProps & {
	tooltip?: string
	side?: 'top' | 'right' | 'bottom' | 'left'
}

export function NavIconButton({ tooltip, side = 'right', ...props }: NavIconButtonProps) {
	if (!tooltip) {
		return <IconButton {...props} />
	}

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<IconButton {...props} />
				</TooltipTrigger>
				<TooltipContent side={side}>{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
