export const FINE_POINTER_HOVER_MEDIA = '(hover: hover) and (pointer: fine)'

export function matchesFinePointerHover(matchMedia: (query: string) => Pick<MediaQueryList, 'matches'>) {
	return matchMedia(FINE_POINTER_HOVER_MEDIA).matches
}

/** True when the event originated in a Radix dropdown/menu portaled to document.body. */
export function isPortaledMenuEventTarget(target: EventTarget | null) {
	return (
		target instanceof Element &&
		Boolean(target.closest('[role="menu"], [data-radix-menu-content], [data-radix-popper-content-wrapper]'))
	)
}
