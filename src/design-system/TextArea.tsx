'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { applyCustomValidity, type ValidityMessageMap } from '@/utils/inputValidity'

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label?: string
	error?: string
	hint?: string
	validityMessages?: ValidityMessageMap
}

export function TextArea({
	label,
	error,
	hint,
	validityMessages,
	className,
	id,
	onInvalid,
	onInput,
	onChange,
	rows = 4,
	...props
}: TextAreaProps) {
	const generatedId = React.useId()
	const inputId = id ?? generatedId

	return (
		<div className="flex w-full flex-col gap-1.5">
			{label ? (
				<label htmlFor={inputId} className="text-sm font-medium text-foreground">
					{label}
				</label>
			) : null}
			<textarea
				id={inputId}
				rows={rows}
				className={cn(
					'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
					error && 'border-destructive focus-visible:ring-destructive',
					className
				)}
				{...props}
				onInvalid={(event) => {
					applyCustomValidity(event.currentTarget, validityMessages)
					onInvalid?.(event)
				}}
				onInput={(event) => {
					event.currentTarget.setCustomValidity('')
					onInput?.(event)
				}}
				onChange={(event) => {
					event.currentTarget.setCustomValidity('')
					onChange?.(event)
				}}
			/>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	)
}
