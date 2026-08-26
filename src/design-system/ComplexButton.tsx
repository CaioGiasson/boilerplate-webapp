'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export type ComplexButtonIcon = LucideIcon | React.ComponentType<{ className?: string }>

type CommonProps = {
	icon: ComplexButtonIcon
	/** When set, replaces the icon with a round photo. */
	imageSrc?: string | null
	title: string
	subtitle: string
	className?: string
	'aria-label'?: string
	'data-testid'?: string
}

type LinkProps = CommonProps & {
	href: string
	onClick?: never
}

type ButtonProps = CommonProps & {
	href?: never
	onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export type ComplexButtonProps = LinkProps | ButtonProps

export function ComplexButton({
	icon: IconComponent,
	imageSrc,
	title,
	subtitle,
	className,
	...props
}: ComplexButtonProps) {
	const body = (
		<>
			<span
				className={cn(
					'flex h-14 w-14 shrink-0 items-center justify-center text-foreground',
					imageSrc && 'overflow-hidden rounded-full'
				)}
			>
				{imageSrc ? (
					// eslint-disable-next-line @next/next/no-img-element -- remote / blob preview
					<img src={imageSrc} alt="" className="h-14 w-14 object-cover" />
				) : (
					<IconComponent className="h-14 w-14" aria-hidden />
				)}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-base font-semibold text-foreground">{title}</span>
				<span className="mt-0.5 block text-sm font-light text-muted-foreground">{subtitle}</span>
			</span>
		</>
	)

	const classes = cn(
		'flex w-full max-w-md cursor-pointer items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm transition-colors',
		'hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
		className
	)

	if ('href' in props && props.href) {
		return (
			<Link
				href={props.href}
				className={classes}
				aria-label={props['aria-label']}
				data-testid={props['data-testid']}
			>
				{body}
			</Link>
		)
	}

	return (
		<button
			type="button"
			className={classes}
			aria-label={props['aria-label']}
			data-testid={props['data-testid']}
			onClick={props.onClick}
		>
			{body}
		</button>
	)
}
