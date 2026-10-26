import sharp from 'sharp'
import { ValidationError } from '@/errors'

export const IMAGE_OUTPUT_MIME = 'image/webp'
export const AVATAR_PIVOT_PX = 512
export const GALLERY_IMAGE_MAX_PIVOT_PX = 1600
export const THUMBNAIL_PIVOT_PX = 200

const WEBP_QUALITY = 82
const THUMBNAIL_WEBP_QUALITY = 75
/** Teto de pixels decodificados: protege contra imagens pequenas em bytes e enormes em pixels (decompression bomb). */
const MAX_INPUT_PIXELS = 40_000_000
/** Só formatos raster esperados; SVG e afins ficam de fora (sharp os rasteriza via librsvg). */
const ACCEPTED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif'])

export type ImageVariant = 'avatar' | 'image'

export type ProcessedImage = {
	main: Buffer
	thumbnail: Buffer
	mimeType: typeof IMAGE_OUTPUT_MIME
}

/** Normaliza a imagem enviada e gera o thumbnail. Troque a implementação nos testes. */
export interface ImageProcessorPort {
	process(buffer: Buffer, variant: ImageVariant): Promise<ProcessedImage>
}

function openImage(buffer: Buffer): sharp.Sharp {
	return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
}

async function assertAcceptedImage(buffer: Buffer): Promise<void> {
	try {
		const { format } = await openImage(buffer).metadata()
		if (!format || !ACCEPTED_INPUT_FORMATS.has(format)) {
			throw new ValidationError('Unsupported image type')
		}
	} catch (error: unknown) {
		if (error instanceof ValidationError) throw error
		throw new ValidationError('Invalid image')
	}
}

/** Avatar: quadrado `AVATAR_PIVOT_PX`, recortado ao centro. Galeria: cabe em `GALLERY_IMAGE_MAX_PIVOT_PX`, sem ampliar. */
export async function normalizeToWebp(buffer: Buffer, variant: ImageVariant): Promise<Buffer> {
	const image = openImage(buffer).rotate()
	const resized =
		variant === 'avatar'
			? image.resize(AVATAR_PIVOT_PX, AVATAR_PIVOT_PX, { fit: 'cover', position: 'centre' })
			: image.resize(GALLERY_IMAGE_MAX_PIVOT_PX, GALLERY_IMAGE_MAX_PIVOT_PX, {
					fit: 'inside',
					withoutEnlargement: true,
				})

	return resized.webp({ quality: WEBP_QUALITY }).toBuffer()
}

/** Thumbnail de `THUMBNAIL_PIVOT_PX` no maior lado, sempre a partir da imagem já normalizada. */
export async function resizeThumbnailWebp(normalized: Buffer): Promise<Buffer> {
	return sharp(normalized)
		.resize(THUMBNAIL_PIVOT_PX, THUMBNAIL_PIVOT_PX, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: THUMBNAIL_WEBP_QUALITY })
		.toBuffer()
}

export function isWebpBuffer(buffer: Buffer): boolean {
	return (
		buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
	)
}

export class SharpImageProcessor implements ImageProcessorPort {
	async process(buffer: Buffer, variant: ImageVariant): Promise<ProcessedImage> {
		await assertAcceptedImage(buffer)

		try {
			const main = await normalizeToWebp(buffer, variant)
			const thumbnail = await resizeThumbnailWebp(main)
			return { main, thumbnail, mimeType: IMAGE_OUTPUT_MIME }
		} catch (error: unknown) {
			if (error instanceof ValidationError) throw error
			throw new ValidationError('Invalid image')
		}
	}
}
