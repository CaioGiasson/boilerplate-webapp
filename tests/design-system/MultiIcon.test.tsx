/**
 * @jest-environment jsdom
 */
import { Home, Star } from 'lucide-react'
import { MultiIcon } from '@/design-system/MultiIcon'
import { renderInJsdom } from '../helpers/renderInJsdom'

describe('MultiIcon', () => {
	it('renderiza um svg por ícone, empilhados por padrão', () => {
		const { container, unmount } = renderInJsdom(<MultiIcon icons={[{ icon: Star }, { icon: Home }]} />)

		expect(container.querySelectorAll('svg')).toHaveLength(2)
		expect(container.firstElementChild?.className).toContain('flex-col')
		unmount()
	})

	it('usa linha quando layout="row"', () => {
		const { container, unmount } = renderInJsdom(<MultiIcon icons={[{ icon: Star }]} layout="row" />)

		expect(container.firstElementChild?.className).toContain('flex-row')
		unmount()
	})

	it('não renderiza nada sem ícones', () => {
		const { container, unmount } = renderInJsdom(<MultiIcon icons={[]} />)

		expect(container.innerHTML).toBe('')
		unmount()
	})
})
