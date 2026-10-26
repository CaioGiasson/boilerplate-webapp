import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

type RenderResult = {
	container: HTMLDivElement
	root: Root
	unmount: () => void
}

/**
 * Monta um elemento React em jsdom sem Testing Library.
 * O arquivo de teste precisa do docblock `@jest-environment jsdom`.
 */
export function renderInJsdom(element: React.ReactElement): RenderResult {
	;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
	const container = document.createElement('div')
	document.body.appendChild(container)
	const root = createRoot(container)
	act(() => {
		root.render(element)
	})

	return {
		container,
		root,
		unmount: () => {
			act(() => root.unmount())
			container.remove()
		},
	}
}
