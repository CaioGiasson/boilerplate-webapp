'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { SelectOption } from '@/design-system/Select'

export type AppMultiSelectProps = {
	label?: string
	placeholder?: string
	options: SelectOption[]
	values: string[]
	onValuesChange: (values: string[]) => void
	disabled?: boolean
	'aria-label'?: string
}

export function AppMultiSelect({
	label,
	placeholder,
	options,
	values,
	onValuesChange,
	disabled,
	'aria-label': ariaLabel,
}: AppMultiSelectProps) {
	const selectedLabels = options.filter((option) => values.includes(option.value)).map((option) => option.label)
	const summary = selectedLabels.length > 0 ? selectedLabels.join(', ') : (placeholder ?? '')

	function toggle(value: string) {
		if (values.includes(value)) {
			onValuesChange(values.filter((item) => item !== value))
			return
		}
		onValuesChange([...values, value])
	}

	return (
		<div className="flex w-full flex-col gap-1.5">
			{label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}
			<DropdownMenu>
				<DropdownMenuTrigger asChild disabled={disabled}>
					<button
						type="button"
						aria-label={ariaLabel ?? label}
						className={cn(
							'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
						)}
					>
						<span
							className={cn(
								'min-w-0 flex-1 truncate',
								selectedLabels.length === 0 && 'text-muted-foreground'
							)}
						>
							{summary}
						</span>
						<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
					{options.map((option) => {
						const selected = values.includes(option.value)
						return (
							<DropdownMenuItem
								key={option.value}
								onSelect={(event) => {
									event.preventDefault()
									toggle(option.value)
								}}
							>
								<span
									className={cn(
										'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-input',
										selected && 'border-primary bg-primary text-primary-foreground'
									)}
								>
									{selected ? <Check className="h-3 w-3" /> : null}
								</span>
								{option.label}
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
