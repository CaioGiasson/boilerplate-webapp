/**
 * Coordinates shell page transitions with navigation.
 * Exit paints a DOM freeze of the current page, then navigation may proceed.
 */

export type PageTransitionHandlers = {
	/** Freeze + fade out current page. Resolves when the outgoing page is fully hidden. */
	exit: () => Promise<void>
	/** Fade in the live page slot (call after the new route has committed). */
	enter: () => Promise<void>
	restore: () => void
}

let handlers: PageTransitionHandlers | null = null
let chain: Promise<void> = Promise.resolve()

function prefersReducedMotion() {
	if (typeof window === 'undefined') return false
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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

function waitForLocationChange(from: string, timeoutMs = 8000) {
	return new Promise<void>((resolve) => {
		if (window.location.pathname + window.location.search !== from) {
			resolve()
			return
		}

		const started = performance.now()
		const timer = window.setInterval(() => {
			const current = window.location.pathname + window.location.search
			if (current !== from || performance.now() - started > timeoutMs) {
				window.clearInterval(timer)
				resolve()
			}
		}, 16)
	})
}

export function registerPageTransitionHandlers(next: PageTransitionHandlers) {
	handlers = next
	return () => {
		if (handlers === next) handlers = null
	}
}

export function restorePageTransition() {
	handlers?.restore()
}

/**
 * Runs the core page transition around a navigation callback:
 * fade-out (frozen old page) → navigate → wait for URL → fade-in (new page).
 */
export function runPageTransition(navigate: () => void | Promise<void>) {
	chain = chain.then(async () => {
		if (prefersReducedMotion() || !handlers) {
			await navigate()
			return
		}

		const current = handlers
		const from = window.location.pathname + window.location.search
		await current.exit()
		await navigate()
		await waitForLocationChange(from)
		// Let React commit the incoming page before fading it in.
		await delay(16)
		await nextFrame()
		await nextFrame()
		await current.enter()
	})
	return chain
}
