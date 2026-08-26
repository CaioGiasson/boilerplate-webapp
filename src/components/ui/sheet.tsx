'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isPortaledMenuEventTarget } from '@/utils/pointerHover'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-black/50', className)} {...props} />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
	title: string
	closeLabel: string
}

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
	({ className, children, title, closeLabel, onInteractOutside, onPointerDownOutside, ...props }, ref) => (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Content
				ref={ref}
				className={cn('fixed inset-y-0 left-0 z-50 h-full outline-none', className)}
				{...props}
				onInteractOutside={(event) => {
					if (isPortaledMenuEventTarget(event.target)) {
						event.preventDefault()
						return
					}
					onInteractOutside?.(event)
				}}
				onPointerDownOutside={(event) => {
					if (isPortaledMenuEventTarget(event.target)) {
						event.preventDefault()
						return
					}
					onPointerDownOutside?.(event)
				}}
			>
				<DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
				<DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
				{children}
				<DialogPrimitive.Close className="absolute top-3 left-[4.5rem] rounded-md border border-border bg-surface p-2 text-foreground shadow">
					<X className="h-4 w-4" />
					<span className="sr-only">{closeLabel}</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</SheetPortal>
	)
)
SheetContent.displayName = DialogPrimitive.Content.displayName

export { Sheet, SheetTrigger, SheetClose, SheetContent }
