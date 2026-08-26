'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { Icon } from '@/design-system/Icon'
import { cn } from '@/lib/utils'

type AccordionGroupContextValue = {
	inGroup: boolean
}

const AccordionGroupContext = React.createContext<AccordionGroupContextValue>({ inGroup: false })

export type AccordionGroupProps = {
	children: React.ReactNode
	className?: string
	defaultValue?: string
	value?: string
	onValueChange?: (value: string) => void
}

/**
 * Agrupa várias AccordionSection: só uma aberta por vez.
 */
export function AccordionGroup({ children, className, defaultValue, value, onValueChange }: AccordionGroupProps) {
	return (
		<AccordionGroupContext.Provider value={{ inGroup: true }}>
			<AccordionPrimitive.Root
				type="single"
				collapsible
				defaultValue={defaultValue}
				value={value}
				onValueChange={onValueChange}
				className={cn('space-y-6', className)}
			>
				{children}
			</AccordionPrimitive.Root>
		</AccordionGroupContext.Provider>
	)
}

export type AccordionSectionProps = {
	title: string
	description?: string
	children: React.ReactNode
	className?: string
	titleClassName?: string
	titleIcon?: LucideIcon
	defaultOpen?: boolean
	/** Obrigatório dentro de AccordionGroup para exclusividade entre seções. */
	value?: string
	'data-testid'?: string
}

/**
 * Seção colapsável estilo settings, com chevron à direita.
 */
export function AccordionSection({
	title,
	description,
	children,
	className,
	titleClassName,
	titleIcon,
	defaultOpen = false,
	value = 'item',
	'data-testid': testId,
}: AccordionSectionProps) {
	const { inGroup } = React.useContext(AccordionGroupContext)

	const item = (
		<AccordionPrimitive.Item
			value={value}
			className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}
			data-testid={testId}
		>
			<AccordionPrimitive.Header asChild>
				<h4 className="m-0">
					<AccordionPrimitive.Trigger className="flex w-full cursor-pointer items-center justify-between gap-4 p-3 text-left transition-colors hover:bg-accent/40 [&[data-state=open]>svg.accordion-chevron]:rotate-180">
						<span className="min-w-0 space-y-1">
							<span
								className={cn(
									'flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground',
									titleClassName
								)}
							>
								{titleIcon ? <Icon icon={titleIcon} className="size-5 shrink-0" aria-hidden /> : null}
								<span className="min-w-0">{title}</span>
							</span>
							{description ? (
								<span className="block text-sm font-normal text-muted-foreground">{description}</span>
							) : null}
						</span>
						<Icon
							icon={ChevronDown}
							className="accordion-chevron size-5 shrink-0 text-muted-foreground transition-transform duration-200"
						/>
					</AccordionPrimitive.Trigger>
				</h4>
			</AccordionPrimitive.Header>
			<AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
				<div className="space-y-4 px-3 pt-3 pb-3">{children}</div>
			</AccordionPrimitive.Content>
		</AccordionPrimitive.Item>
	)

	if (inGroup) {
		return item
	}

	return (
		<AccordionPrimitive.Root type="single" collapsible defaultValue={defaultOpen ? value : undefined}>
			{item}
		</AccordionPrimitive.Root>
	)
}
