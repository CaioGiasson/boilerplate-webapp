'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Icon } from '@/design-system/Icon'
import { TAG_MAX_LENGTH, TAGS_MAX_COUNT } from '@/constants/tags'

export type TagsInputProps = {
	label?: string
	hint?: string
	error?: string
	value: string[]
	onChange: (tags: string[]) => void
	placeholder?: string
	disabled?: boolean
	id?: string
	maxTags?: number
	maxTagLength?: number
	'data-testid'?: string
}

function tokenize(raw: string): string[] {
	return raw
		.split(/[\s,]+/)
		.map((tag) => tag.trim())
		.filter(Boolean)
}

export function TagsInput({
	label,
	hint,
	error,
	value,
	onChange,
	placeholder,
	disabled,
	id,
	maxTags = TAGS_MAX_COUNT,
	maxTagLength = TAG_MAX_LENGTH,
	'data-testid': testId,
}: TagsInputProps) {
	const generatedId = React.useId()
	const inputId = id ?? generatedId
	const [draft, setDraft] = React.useState('')

	const addTokens = (raw: string) => {
		const next = [...value]
		for (const tag of tokenize(raw)) {
			if (next.length >= maxTags) break
			const clipped = tag.slice(0, maxTagLength)
			if (!clipped) continue
			const exists = next.some((item) => item.toLowerCase() === clipped.toLowerCase())
			if (!exists) next.push(clipped)
		}
		onChange(next)
		setDraft('')
	}

	const removeTag = (tag: string) => {
		onChange(value.filter((item) => item !== tag))
	}

	return (
		<div className="flex w-full flex-col gap-1.5">
			{label ? (
				<label htmlFor={inputId} className="text-sm font-medium text-foreground">
					{label}
				</label>
			) : null}
			<div
				className={cn(
					'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring',
					error && 'border-destructive focus-within:ring-destructive',
					disabled && 'opacity-50'
				)}
			>
				{value.map((tag) => (
					<span
						key={tag}
						className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
						data-testid={`${testId ?? 'tags'}-chip`}
					>
						{tag}
						<button
							type="button"
							className="rounded-full p-0.5 hover:bg-background/80"
							aria-label={`Remove ${tag}`}
							disabled={disabled}
							onClick={() => removeTag(tag)}
						>
							<Icon icon={X} className="h-3 w-3" />
						</button>
					</span>
				))}
				<input
					id={inputId}
					value={draft}
					disabled={disabled || value.length >= maxTags}
					maxLength={maxTagLength}
					placeholder={value.length === 0 ? placeholder : undefined}
					data-testid={testId}
					className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === ' ' || event.key === ',' || event.key === 'Enter') {
							event.preventDefault()
							if (draft.trim()) addTokens(draft)
						} else if (event.key === 'Backspace' && !draft && value.length) {
							removeTag(value[value.length - 1])
						}
					}}
					onBlur={() => {
						if (draft.trim()) addTokens(draft)
					}}
					onPaste={(event) => {
						const text = event.clipboardData.getData('text')
						if (/[,\s]/.test(text)) {
							event.preventDefault()
							addTokens(`${draft} ${text}`)
						}
					}}
				/>
			</div>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	)
}
