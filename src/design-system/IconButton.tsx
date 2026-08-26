import * as React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type IconButtonProps = Omit<ButtonProps, 'size' | 'children'> & {
	label: string
	children: React.ReactNode
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
	{ label, className, children, ...props },
	ref
) {
	return (
		<Button
			ref={ref}
			type="button"
			variant="ghost"
			size="icon"
			aria-label={label}
			className={cn(className)}
			{...props}
		>
			{children}
		</Button>
	)
})
