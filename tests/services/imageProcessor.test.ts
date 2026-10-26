import sharp from 'sharp'
import { ValidationError } from '@/errors'
import {
	AVATAR_PIVOT_PX,
	GALLERY_IMAGE_MAX_PIVOT_PX,
	SharpImageProcessor,
	THUMBNAIL_PIVOT_PX,
	isWebpBuffer,
} from '@/services/Storage/imageProcessor'

async function solidImage(width: number, height: number, format: 'jpeg' | 'png' | 'webp' | 'gif' = 'png') {
	return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })
		.toFormat(format)
		.toBuffer()
}

describe('SharpImageProcessor', () => {
	const processor = new SharpImageProcessor()

	it('avatar: WebP quadrado de 512 px recortado ao centro e thumbnail de 200 px', async () => {
		const result = await processor.process(await solidImage(1200, 800, 'jpeg'), 'avatar')

		expect(result.mimeType).toBe('image/webp')
		expect(isWebpBuffer(result.main)).toBe(true)
		expect(isWebpBuffer(result.thumbnail)).toBe(true)
		const main = await sharp(result.main).metadata()
		const thumbnail = await sharp(result.thumbnail).metadata()
		expect([main.width, main.height]).toEqual([AVATAR_PIVOT_PX, AVATAR_PIVOT_PX])
		expect([thumbnail.width, thumbnail.height]).toEqual([THUMBNAIL_PIVOT_PX, THUMBNAIL_PIVOT_PX])
	})

	it('imagem de galeria: cabe em 1600 px mantendo a proporção e não amplia', async () => {
		const big = await processor.process(await solidImage(3200, 1600), 'image')
		const bigMeta = await sharp(big.main).metadata()
		expect([bigMeta.width, bigMeta.height]).toEqual([GALLERY_IMAGE_MAX_PIVOT_PX, 800])

		const small = await processor.process(await solidImage(300, 200), 'image')
		const smallMeta = await sharp(small.main).metadata()
		expect([smallMeta.width, smallMeta.height]).toEqual([300, 200])
		const thumbnailMeta = await sharp(small.thumbnail).metadata()
		expect(Math.max(thumbnailMeta.width ?? 0, thumbnailMeta.height ?? 0)).toBe(THUMBNAIL_PIVOT_PX)
	})

	it('aplica a orientação EXIF antes de recortar', async () => {
		const rotated = await sharp(await solidImage(400, 200, 'jpeg'))
			.withMetadata({ orientation: 6 })
			.jpeg()
			.toBuffer()

		const result = await processor.process(rotated, 'image')

		const meta = await sharp(result.main).metadata()
		expect([meta.width, meta.height]).toEqual([200, 400])
	})

	it.each(['png', 'jpeg', 'webp', 'gif'] as const)('aceita %s', async (format) => {
		const result = await processor.process(await solidImage(64, 64, format), 'avatar')

		expect(isWebpBuffer(result.main)).toBe(true)
	})

	it('recusa SVG, mesmo com mime de imagem', async () => {
		const svg = Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
		)

		await expect(processor.process(svg, 'avatar')).rejects.toBeInstanceOf(ValidationError)
	})

	it('recusa bytes que não são imagem', async () => {
		await expect(processor.process(Buffer.from('isto não é uma imagem'), 'avatar')).rejects.toBeInstanceOf(
			ValidationError
		)
	})

	it('recusa imagem com pixels demais (decompression bomb)', async () => {
		const huge = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#000' } })
			.png({ compressionLevel: 9 })
			.toBuffer()

		await expect(processor.process(huge, 'image')).rejects.toBeInstanceOf(ValidationError)
	})
})

describe('isWebpBuffer', () => {
	it('reconhece o cabeçalho RIFF/WEBP', () => {
		expect(isWebpBuffer(Buffer.from('RIFF....WEBPxxxx'))).toBe(true)
		expect(isWebpBuffer(Buffer.from('not webp at all'))).toBe(false)
		expect(isWebpBuffer(Buffer.alloc(4))).toBe(false)
	})
})
