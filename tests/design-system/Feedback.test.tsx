/**
 * @jest-environment jsdom
 */
import { Inbox } from 'lucide-react'
import { Badge } from '@/design-system/Badge'
import { EmptyState } from '@/design-system/EmptyState'
import { Skeleton } from '@/design-system/Skeleton'
import { renderInJsdom } from '../helpers/renderInJsdom'

describe('Badge', () => {
	it('usa o tom neutro por padrão e aceita outro tom', () => {
		const { container, unmount } = renderInJsdom(
			<>
				<Badge>Padrão</Badge>
				<Badge variant="danger">Bloqueado</Badge>
			</>
		)

		const [neutral, danger] = Array.from(container.querySelectorAll('span'))
		expect(neutral.className).toContain('bg-muted')
		expect(danger.className).toContain('text-red-700')
		expect(danger.textContent).toBe('Bloqueado')
		unmount()
	})
})

describe('Skeleton', () => {
	it('é decorativo (aria-hidden) e aceita tamanho por className', () => {
		const { container, unmount } = renderInJsdom(<Skeleton className="h-4 w-32" />)

		const block = container.firstElementChild
		expect(block?.getAttribute('aria-hidden')).toBe('true')
		expect(block?.className).toContain('animate-pulse')
		expect(block?.className).toContain('w-32')
		unmount()
	})
})

describe('EmptyState', () => {
	it('mostra título, descrição, ícone e ação', () => {
		const { container, unmount } = renderInJsdom(
			<EmptyState
				icon={Inbox}
				title="Nada aqui"
				description="Crie o primeiro item."
				action={<button type="button">Criar</button>}
				data-testid="empty"
			/>
		)

		const root = container.querySelector('[data-testid="empty"]')
		expect(root?.textContent).toContain('Nada aqui')
		expect(root?.textContent).toContain('Crie o primeiro item.')
		expect(root?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
		expect(root?.querySelector('button')?.textContent).toBe('Criar')
		unmount()
	})

	it('omite ícone, descrição e ação quando não vêm', () => {
		const { container, unmount } = renderInJsdom(<EmptyState title="Vazio" />)

		expect(container.querySelector('svg')).toBeNull()
		expect(container.querySelectorAll('p')).toHaveLength(1)
		unmount()
	})
})
