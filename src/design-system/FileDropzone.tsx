'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type FileDropzoneProps = {
	label?: string
	hint?: string
	error?: string
	accept?: string
	multiple?: boolean
	disabled?: boolean
	files: File[]
	onFilesChange: (files: File[]) => void
	emptyLabel: string
	id?: string
	'data-testid'?: string
}

export function FileDropzone({
	label,
	hint,
	error,
	accept,
	multiple = true,
	disabled,
	files,
	onFilesChange,
	emptyLabel,
	id,
	'data-testid': testId,
}: FileDropzoneProps) {
	const generatedId = React.useId()
	const inputId = id ?? generatedId
	const inputRef = React.useRef<HTMLInputElement>(null)
	const [dragging, setDragging] = React.useState(false)

	const mergeFiles = (incoming: FileList | File[]) => {
		const list = Array.from(incoming)
		if (!multiple) {
			onFilesChange(list.slice(0, 1))
			return
		}
		const byKey = new Map(files.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file]))
		for (const file of list) {
			byKey.set(`${file.name}:${file.size}:${file.lastModified}`, file)
		}
		onFilesChange(Array.from(byKey.values()))
	}

	return (
		<div className="flex w-full flex-col gap-1.5">
			{label ? (
				<label htmlFor={inputId} className="text-sm font-medium text-foreground">
					{label}
				</label>
			) : null}
			<input
				ref={inputRef}
				id={inputId}
				type="file"
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				className="sr-only"
				data-testid={testId}
				onChange={(event) => {
					if (event.target.files) mergeFiles(event.target.files)
				}}
			/>
			<button
				type="button"
				disabled={disabled}
				data-testid={testId ? `${testId}-dropzone` : undefined}
				className={cn(
					'flex min-h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors',
					dragging ? 'border-primary bg-primary/10' : 'border-input bg-background',
					error && 'border-destructive',
					disabled && 'cursor-not-allowed opacity-50'
				)}
				onClick={() => inputRef.current?.click()}
				onDragEnter={(event) => {
					event.preventDefault()
					if (!disabled) setDragging(true)
				}}
				onDragOver={(event) => {
					event.preventDefault()
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(event) => {
					event.preventDefault()
					setDragging(false)
					if (!disabled && event.dataTransfer.files.length) {
						mergeFiles(event.dataTransfer.files)
					}
				}}
			>
				<span className="text-muted-foreground">{emptyLabel}</span>
			</button>
			{files.length > 0 ? (
				<ul
					className="max-h-40 overflow-auto text-xs text-muted-foreground"
					data-testid={testId ? `${testId}-list` : undefined}
				>
					{files.map((file) => (
						<li key={`${file.name}:${file.size}:${file.lastModified}`}>{file.name}</li>
					))}
				</ul>
			) : null}
			{hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
		</div>
	)
}
