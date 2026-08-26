'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { applyCustomValidity, type ValidityMessageMap } from '@/utils/inputValidity'

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label?: string
	error?: string
	success?: string
	hint?: string
	/** Sobrescreve mensagens nativas do browser (required, type=email, etc.). */
	validityMessages?: ValidityMessageMap
}

export function TextInput({
	label,
	error,
	success,
	hint,
	validityMessages,
	className,
	id,
	onInvalid,
	onInput,
	onChange,
	...props
}: TextInputProps) {
	const generatedId = React.useId()
	const inputId = id ?? generatedId

	return (
		<div className="flex w-full flex-col gap-1.5">
			{label ? (
				<label htmlFor={inputId} className="text-sm font-medium text-foreground">
					{label}
				</label>
			) : null}
			<input
				id={inputId}
				className={cn(
					'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
					error && 'border-destructive focus-visible:ring-destructive',
					success && !error && 'border-emerald-600 focus-visible:ring-emerald-600',
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
			{!error && success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}
			{!error && !success && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	)
}
