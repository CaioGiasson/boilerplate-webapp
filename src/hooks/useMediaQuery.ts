import * as React from 'react'

/** `true` quando a media query casa. No servidor (e na hidratação) devolve `false`. */
export function useMediaQuery(query: string): boolean {
	const subscribe = React.useCallback(
		(onChange: () => void) => {
			const media = window.matchMedia(query)
			media.addEventListener('change', onChange)
			return () => media.removeEventListener('change', onChange)
		},
		[query]
	)
	return React.useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		() => false
	)
}
