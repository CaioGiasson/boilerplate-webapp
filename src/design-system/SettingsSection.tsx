import * as React from 'react'
import { Title } from '@/design-system/Title'
import { cn } from '@/lib/utils'

export type SettingsSectionProps = {
	title: string
	description?: string
	children: React.ReactNode
	className?: string
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
	return (
		<section
			className={cn('rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm', className)}
		>
			<header className="mb-6 space-y-1">
				<Title as="h4">{title}</Title>
				{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
			</header>
			<div className="space-y-4">{children}</div>
		</section>
	)
}
