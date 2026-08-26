'use client'

import * as React from 'react'
import { registerPageTransitionHandlers } from '@/components/layout/pageTransitionController'

const FADE_MS = 150
const GAP_MS = 10

function delay(ms: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

function nextFrame() {
	return new Promise<void>((resolve) => {
		window.requestAnimationFrame(() => resolve())
	})
}

type PageTransitionProps = {
	children: React.ReactNode
}

/**
 * Core page transition slot.
 * Navigation wrappers call the registered exit/enter handlers so the outgoing
 * page is frozen in a DOM overlay (App Router cannot keep previous React children).
 */
export function PageTransition({ children }: PageTransitionProps) {
	const slotRef = React.useRef<HTMLDivElement>(null)
	const [opacity, setOpacity] = React.useState(1)
	const [animate, setAnimate] = React.useState(false)
	const runIdRef = React.useRef(0)

	React.useEffect(() => {
		return registerPageTransitionHandlers({
			exit: async () => {
				const runId = ++runIdRef.current
				const slot = slotRef.current
				const parent = slot?.parentElement
				if (!slot || !parent) {
					setAnimate(true)
					setOpacity(0)
					await delay(FADE_MS + GAP_MS)
					return
				}

				const overlay = slot.cloneNode(true) as HTMLElement
				overlay.removeAttribute('data-testid')
				overlay.setAttribute('aria-hidden', 'true')
				overlay.setAttribute('data-page-transition-overlay', '')
				const slotRect = slot.getBoundingClientRect()
				const parentRect = parent.getBoundingClientRect()
				Object.assign(overlay.style, {
					position: 'absolute',
					left: `${slotRect.left - parentRect.left + parent.scrollLeft}px`,
					top: `${slotRect.top - parentRect.top + parent.scrollTop}px`,
					width: `${slotRect.width}px`,
					height: `${slotRect.height}px`,
					margin: '0',
					zIndex: '20',
					pointerEvents: 'none',
					opacity: '1',
					overflow: 'hidden',
					backgroundColor: getComputedStyle(parent).backgroundColor || 'var(--background)',
					transition: 'none',
				})

				parent.appendChild(overlay)

				// Hide the live slot immediately; overlay holds the outgoing pixels.
				setAnimate(false)
				setOpacity(0)
				await nextFrame()
				if (runId !== runIdRef.current) {
					overlay.remove()
					return
				}

				overlay.style.transition = `opacity ${FADE_MS}ms ease`
				void overlay.offsetHeight
				overlay.style.opacity = '0'

				await delay(FADE_MS + GAP_MS)
				overlay.remove()
			},
			enter: async () => {
				const runId = ++runIdRef.current
				setAnimate(true)
				setOpacity(0)
				await nextFrame()
				await nextFrame()
				if (runId !== runIdRef.current) return
				setOpacity(1)
				await delay(FADE_MS)
			},
			restore: () => {
				runIdRef.current += 1
				document.querySelectorAll('[data-page-transition-overlay]').forEach((node) => node.remove())
				setAnimate(false)
				setOpacity(1)
			},
		})
	}, [])

	return (
		<div
			ref={slotRef}
			className="min-h-full"
			style={{
				opacity,
				transition: animate ? `opacity ${FADE_MS}ms ease` : undefined,
			}}
			data-testid="page-transition"
		>
			{children}
		</div>
	)
}
