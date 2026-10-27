/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { DataTable, type DataTableColumn } from '@/design-system/DataTable'
import { renderInJsdom } from '../helpers/renderInJsdom'

type Row = { id: string; name: string }

const ROWS: Row[] = [
	{ id: '1', name: 'Ada' },
	{ id: '2', name: 'Grace' },
]

const COLUMNS: DataTableColumn<Row>[] = [
	{ id: 'name', header: 'Nome', sortable: true, cell: (row) => row.name },
	{ id: 'id', header: 'Id', align: 'right', cell: (row) => row.id },
]

function click(element: Element | null | undefined) {
	act(() => {
		element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
}

describe('DataTable', () => {
	it('renderiza caption acessível, cabeçalhos e uma linha por item', () => {
		const { container, unmount } = renderInJsdom(
			<DataTable caption="Usuários" columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} />
		)

		expect(container.querySelector('caption')?.textContent).toBe('Usuários')
		expect(Array.from(container.querySelectorAll('th')).map((th) => th.textContent)).toEqual(['Nome', 'Id'])
		expect(Array.from(container.querySelectorAll('tbody tr')).map((tr) => tr.textContent)).toEqual([
			'Ada1',
			'Grace2',
		])
		expect(container.querySelectorAll('td')[1]?.className).toContain('text-right')
		unmount()
	})

	it('só colunas ordenáveis têm botão e aria-sort; o ciclo é asc → desc', () => {
		const onSortChange = jest.fn()
		const { container, unmount } = renderInJsdom(
			<DataTable
				caption="Usuários"
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(row) => row.id}
				sort={null}
				onSortChange={onSortChange}
			/>
		)

		const [nameHeader, idHeader] = Array.from(container.querySelectorAll('th'))
		expect(nameHeader.getAttribute('aria-sort')).toBe('none')
		expect(idHeader.getAttribute('aria-sort')).toBeNull()
		expect(idHeader.querySelector('button')).toBeNull()

		click(nameHeader.querySelector('button'))
		expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'asc' })
		unmount()

		const second = renderInJsdom(
			<DataTable
				caption="Usuários"
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(row) => row.id}
				sort={{ columnId: 'name', direction: 'asc' }}
				onSortChange={onSortChange}
			/>
		)
		const sortedHeader = second.container.querySelector('th')
		expect(sortedHeader?.getAttribute('aria-sort')).toBe('ascending')
		click(sortedHeader?.querySelector('button'))
		expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'desc' })
		second.unmount()
	})

	it('loading troca as linhas por skeletons e marca aria-busy', () => {
		const { container, unmount } = renderInJsdom(
			<DataTable
				caption="Usuários"
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(row) => row.id}
				loading
				skeletonRows={3}
			/>
		)

		expect(container.querySelector('table')?.getAttribute('aria-busy')).toBe('true')
		expect(container.querySelectorAll('tbody tr')).toHaveLength(3)
		expect(container.textContent).not.toContain('Ada')
		unmount()
	})

	it('mostra o estado vazio ocupando todas as colunas quando não há linhas', () => {
		const { container, unmount } = renderInJsdom(
			<DataTable
				caption="Usuários"
				columns={COLUMNS}
				rows={[]}
				getRowId={(row: Row) => row.id}
				emptyState={<p>Nada por aqui</p>}
			/>
		)

		const cell = container.querySelector('tbody td')
		expect(cell?.getAttribute('colspan')).toBe('2')
		expect(cell?.textContent).toBe('Nada por aqui')
		unmount()
	})
})
