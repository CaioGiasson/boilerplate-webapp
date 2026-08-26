import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export function InputTextArea({ className, rows = 1, ...props }: InputTextAreaProps) {
	return (
		<textarea
			rows={rows}
			className={cn(
				'block m-0 h-full min-h-0 w-full min-w-0 resize-none bg-transparent p-0 pl-1.5 pt-0.5 shadow-none',
				'border-0 border-l border-t border-solid border-black/15',
				'text-sm leading-relaxed text-slate-600',
				'placeholder:text-muted-foreground',
				'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-black/40',
				'disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...props}
		/>
	)
}
