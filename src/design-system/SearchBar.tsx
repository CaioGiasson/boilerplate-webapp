'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Icon, TextInput } from '@/design-system'
import { cn } from '@/lib/utils'

export type SearchBarProps = {
	value: string
	onValueChange: (value: string) => void
	placeholder?: string
	label?: string
	className?: string
	'data-testid'?: string
}

export function SearchBar({
	value,
	onValueChange,
	placeholder,
	label,
	className,
	'data-testid': testId = 'search-bar',
}: SearchBarProps) {
	return (
		<div className={cn('relative w-full', className)} data-testid={testId}>
			<Icon
				icon={Search}
				className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<TextInput
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				placeholder={placeholder}
				aria-label={label ?? placeholder}
				className="pl-9"
			/>
		</div>
	)
}
