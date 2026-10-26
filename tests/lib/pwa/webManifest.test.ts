import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { APP_NAME } from '@/constants/app'
import { buildWebManifest } from '@/lib/pwa/webManifest'

describe('buildWebManifest', () => {
	const manifest = buildWebManifest()

	it('usa o nome do app e abre em tela cheia a partir de /', () => {
		expect(manifest.name).toBe(APP_NAME)
		expect(manifest.short_name).toBe(APP_NAME)
		expect(manifest.start_url).toBe('/')
		expect(manifest.display).toBe('standalone')
	})

	it('declara ícones 192, 512 e maskable que existem em public/', () => {
		const icons = manifest.icons ?? []

		expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
		expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
		for (const icon of icons) {
			expect(existsSync(join(process.cwd(), 'public', icon.src))).toBe(true)
		}
	})

	it('não carrega marca de outro produto', () => {
		expect(JSON.stringify(manifest)).not.toMatch(/tribal|dungemall|vitraux/i)
	})
})
