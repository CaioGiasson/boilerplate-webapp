/**
 * @jest-environment jsdom
 */
import * as React from 'react'
import { act } from 'react'
import { Tabs, type TabItem } from '@/design-system/Tabs'
import { renderInJsdom } from '../helpers/renderInJsdom'

const ITEMS: TabItem[] = [
	{ id: 'a', label: 'Geral' },
	{ id: 'b', label: 'Segurança', disabled: true },
	{ id: 'c', label: 'Avisos' },
]

function Harness({ onChange }: { onChange: (id: string) => void }) {
	const [value, setValue] = React.useState('a')
	return (
		<Tabs
			items={ITEMS}
			value={value}
			label="Seções"
			onValueChange={(id) => {
				onChange(id)
				setValue(id)
			}}
		>
			<p>Painel {value}</p>
		</Tabs>
	)
}

function press(element: Element | null, key: string) {
	act(() => {
		element?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
	})
}

describe('Tabs', () => {
	it('expõe tablist, aba selecionada e painel ligado à aba ativa', () => {
		const { container, unmount } = renderInJsdom(<Harness onChange={jest.fn()} />)

		expect(container.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Seções')
		const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
		expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
		expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
		const panel = container.querySelector('[role="tabpanel"]')
		expect(panel?.getAttribute('aria-labelledby')).toBe(tabs[0].id)
		expect(panel?.textContent).toBe('Painel a')
		unmount()
	})

	it('clique troca a aba e o conteúdo', () => {
		const onChange = jest.fn()
		const { container, unmount } = renderInJsdom(<Harness onChange={onChange} />)

		act(() => {
			container.querySelectorAll('[role="tab"]')[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(onChange).toHaveBeenCalledWith('c')
		expect(container.querySelector('[role="tabpanel"]')?.textContent).toBe('Painel c')
		unmount()
	})

	it('setas, Home e End percorrem só as abas habilitadas, com volta ao início', () => {
		const onChange = jest.fn()
		const { container, unmount } = renderInJsdom(<Harness onChange={onChange} />)
		const tablist = container.querySelector('[role="tablist"]')

		press(tablist, 'ArrowRight')
		expect(onChange).toHaveBeenLastCalledWith('c')
		press(tablist, 'ArrowRight')
		expect(onChange).toHaveBeenLastCalledWith('a')
		press(tablist, 'ArrowLeft')
		expect(onChange).toHaveBeenLastCalledWith('c')
		press(tablist, 'Home')
		expect(onChange).toHaveBeenLastCalledWith('a')
		press(tablist, 'End')
		expect(onChange).toHaveBeenLastCalledWith('c')
		unmount()
	})
})
