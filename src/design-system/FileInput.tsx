'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type FileInputProps = {
	label?: string
	accept?: string
	error?: string
	helperText?: string
	onFileChange?: (file: File | null) => void
	className?: string
	id?: string
	disabled?: boolean
	'data-testid'?: string
}

export function FileInput({
	label,
	accept,
	error,
	helperText,
	onFileChange,
	className,
	id,
	disabled,
	'data-testid': testId,
}: FileInputProps) {
	const generatedId = React.useId()
	const inputId = id ?? generatedId
	const [fileName, setFileName] = React.useState<string | null>(null)

	return (
		<div className={cn('flex w-full flex-col gap-1.5', className)}>
			{label ? (
				<label htmlFor={inputId} className="text-sm font-medium text-foreground">
					{label}
				</label>
			) : null}
			<input
				id={inputId}
				type="file"
				accept={accept}
				disabled={disabled}
				data-testid={testId}
				className="flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary-foreground"
				onChange={(event) => {
					const file = event.target.files?.[0] ?? null
					setFileName(file?.name ?? null)
					onFileChange?.(file)
				}}
			/>
			{fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
			{helperText && !error ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
		</div>
	)
}
