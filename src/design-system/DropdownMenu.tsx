'use client'

import * as React from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FINE_POINTER_HOVER_MEDIA } from '@/utils/pointerHover'
import { Link } from '@/i18n/navigation'

export type AppDropdownMenuItem = {
	id: string
	label: string
	onSelect?: () => void
	href?: string
	destructive?: boolean
	separatorBefore?: boolean
}

export type AppDropdownMenuProps = {
	trigger: React.ReactNode
	items: AppDropdownMenuItem[]
	align?: 'start' | 'center' | 'end'
	side?: 'top' | 'right' | 'bottom' | 'left'
	/** Abre ao passar o mouse (e fecha ao sair, com pequeno atraso). */
	openOnHover?: boolean
	'data-testid'?: string
}

const HOVER_CLOSE_DELAY_MS = 200

export function AppDropdownMenu({
	trigger,
	items,
	align = 'end',
	side = 'right',
	openOnHover = false,
	'data-testid': testId,
}: AppDropdownMenuProps) {
	const [open, setOpen] = React.useState(false)
	const [hoverCapable, setHoverCapable] = React.useState(false)
	const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
	const hoverOpen = openOnHover && hoverCapable

	React.useEffect(() => {
		if (!openOnHover) return
		const media = window.matchMedia(FINE_POINTER_HOVER_MEDIA)
		const sync = () => setHoverCapable(media.matches)
		sync()
		media.addEventListener('change', sync)
		return () => media.removeEventListener('change', sync)
	}, [openOnHover])

	React.useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current)
			}
		}
	}, [])

	const clearCloseTimer = () => {
		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current)
			closeTimerRef.current = null
		}
	}

	const openMenu = () => {
		clearCloseTimer()
		setOpen(true)
	}

	const scheduleClose = () => {
		clearCloseTimer()
		closeTimerRef.current = setTimeout(() => {
			setOpen(false)
		}, HOVER_CLOSE_DELAY_MS)
	}

	const content = (
		<>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent
				align={align}
				side={side}
				sideOffset={hoverOpen ? 4 : 8}
				data-testid={testId}
				className="dropdown-menu-motion"
				onCloseAutoFocus={(event) => {
					if (hoverOpen) {
						event.preventDefault()
					}
				}}
				onMouseEnter={hoverOpen ? openMenu : undefined}
				onMouseLeave={hoverOpen ? scheduleClose : undefined}
			>
				{items.map((item, index) => {
					const itemClassName = item.destructive
						? 'text-destructive focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive hover:bg-destructive/10 hover:text-destructive'
						: undefined

					return (
						<React.Fragment key={item.id}>
							{index > 0 && (item.destructive || item.separatorBefore) ? <DropdownMenuSeparator /> : null}
							{item.href ? (
								<DropdownMenuItem asChild className={itemClassName}>
									<Link
										href={item.href}
										onClick={(event) => {
											if (
												event.button === 0 &&
												!event.ctrlKey &&
												!event.metaKey &&
												!event.shiftKey &&
												!event.altKey
											) {
												item.onSelect?.()
											}
										}}
										onPointerDown={(event) => {
											if (
												event.button !== 0 ||
												event.ctrlKey ||
												event.metaKey ||
												event.shiftKey
											) {
												event.stopPropagation()
											}
										}}
									>
										{item.label}
									</Link>
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem className={itemClassName} onSelect={() => item.onSelect?.()}>
									{item.label}
								</DropdownMenuItem>
							)}
						</React.Fragment>
					)
				})}
			</DropdownMenuContent>
		</>
	)

	if (!hoverOpen) {
		return <DropdownMenu>{content}</DropdownMenu>
	}

	return (
		<div onMouseEnter={openMenu} onMouseLeave={scheduleClose} className="inline-flex">
			{/*
			  modal={false}: evita o overlay do Radix que remove pointer-events do trigger
			  e causa o menu "piscar" no hover.
			*/}
			<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
				{content}
			</DropdownMenu>
		</div>
	)
}
