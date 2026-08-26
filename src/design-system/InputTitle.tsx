import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputTitleProps = React.InputHTMLAttributes<HTMLInputElement>

export function InputTitle({ className, ...props }: InputTitleProps) {
	return (
		<input
			className={cn(
				'block m-0 w-full min-w-0 bg-transparent p-0 pl-1.5 pt-0.5 shadow-none',
				'border-0 border-l border-t border-solid border-black/15',
				'text-2xl font-semibold tracking-tight text-slate-900',
				'placeholder:text-muted-foreground',
				'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-black/40',
				'disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...props}
		/>
	)
}
