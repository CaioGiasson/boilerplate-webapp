import { Home, Images, SquarePlus, type LucideIcon } from 'lucide-react'

export type NavItemConfig = {
	id: string
	href: '/' | '/images' | '/create'
	icon: LucideIcon
	labelKey: 'home' | 'images' | 'create'
	placement: 'main' | 'footer'
}

export const NAV_ITEMS: NavItemConfig[] = [
	{
		id: 'home',
		href: '/',
		icon: Home,
		labelKey: 'home',
		placement: 'main',
	},
	{
		id: 'images',
		href: '/images',
		icon: Images,
		labelKey: 'images',
		placement: 'main',
	},
	{
		id: 'create',
		href: '/create',
		icon: SquarePlus,
		labelKey: 'create',
		placement: 'main',
	},
]
