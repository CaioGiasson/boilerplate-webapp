export type PixelCrop = {
	x: number
	y: number
	width: number
	height: number
}

export const AVATAR_OUTPUT_SIZE_PX = 512
const WEBP_QUALITY = 0.85

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.addEventListener('load', () => resolve(image), { once: true })
		image.addEventListener('error', () => reject(new Error('IMAGE_LOAD_FAILED')), { once: true })
		image.src = src
	})
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('CROP_FAILED'))
					return
				}
				resolve(blob)
			},
			type,
			quality
		)
	})
}

/** Lado do recorte quadrado de saída: não amplia além do que a área escolhida tem de pixels reais. */
export function avatarOutputSize(cropWidth: number, maxSize: number = AVATAR_OUTPUT_SIZE_PX): number {
	return Math.max(1, Math.min(Math.round(cropWidth), maxSize))
}

/**
 * Recorta a área escolhida e codifica em WebP (o navegador cai para PNG se não suportar WebP).
 * O servidor normaliza de novo (WebP 512 px + thumbnail); este passo só reduz o upload.
 */
export async function cropToWebpBlob(imageSrc: string, crop: PixelCrop): Promise<Blob> {
	if (crop.width < 1 || crop.height < 1) {
		throw new Error('CROP_FAILED')
	}

	const image = await loadImage(imageSrc)
	const size = avatarOutputSize(crop.width)
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const context = canvas.getContext('2d')
	if (!context) {
		throw new Error('CROP_FAILED')
	}

	context.imageSmoothingEnabled = true
	context.imageSmoothingQuality = 'high'
	context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size)

	return canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
}
