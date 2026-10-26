/**
 * Gera os ícones PWA de placeholder em public/ (inicial do APP_NAME sobre fundo escuro).
 * Troque pelos ícones da marca do seu produto: basta sobrescrever os mesmos arquivos.
 *
 * Uso: npm run pwa:icons
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BACKGROUND = '#121212'
const FOREGROUND = '#f4f4f5'

const appName =
	/APP_NAME\s*=\s*'([^']*)'/.exec(readFileSync(resolve(root, 'src/constants/app.ts'), 'utf8'))?.[1] ?? 'App'
const initial = (appName.trim().charAt(0) || 'A').toUpperCase().replace(/[<>&]/g, '')

/** `safeZone` < 1 encolhe a letra para o ícone "maskable" (o sistema recorta até ~20% das bordas). */
function iconSvg(size, safeZone) {
	const fontSize = Math.round(size * 0.56 * safeZone)
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
	<rect width="${size}" height="${size}" fill="${BACKGROUND}"/>
	<text x="50%" y="50%" fill="${FOREGROUND}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${initial}</text>
</svg>`
}

const ICONS = [
	{ file: 'pwa-192.png', size: 192, safeZone: 1 },
	{ file: 'pwa-512.png', size: 512, safeZone: 1 },
	{ file: 'pwa-maskable-512.png', size: 512, safeZone: 0.7 },
	{ file: 'apple-touch-icon.png', size: 180, safeZone: 1 },
]

for (const { file, size, safeZone } of ICONS) {
	const png = await sharp(Buffer.from(iconSvg(size, safeZone)))
		.png()
		.toBuffer()
	writeFileSync(resolve(root, 'public', file), png)
	console.log(`public/${file} (${size}x${size})`)
}
