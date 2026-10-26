/**
 * @jest-environment jsdom
 */
import { AppMultiSelect } from '@/design-system/MultiSelect'
import { renderInJsdom } from '../helpers/renderInJsdom'

const OPTIONS = [
	{ value: 'a', label: 'Opção A' },
	{ value: 'b', label: 'Opção B' },
	{ value: 'c', label: 'Opção C' },
]

describe('AppMultiSelect', () => {
	it('resume as opções selecionadas separadas por vírgula', () => {
		const { container, unmount } = renderInJsdom(
			<AppMultiSelect label="Opções" options={OPTIONS} values={['a', 'c']} onValuesChange={jest.fn()} />
		)

		expect(container.querySelector('button')?.textContent).toBe('Opção A, Opção C')
		unmount()
	})

	it('mostra o placeholder sem seleção', () => {
		const { container, unmount } = renderInJsdom(
			<AppMultiSelect placeholder="Escolha" options={OPTIONS} values={[]} onValuesChange={jest.fn()} />
		)

		expect(container.querySelector('button')?.textContent).toBe('Escolha')
		unmount()
	})
})
