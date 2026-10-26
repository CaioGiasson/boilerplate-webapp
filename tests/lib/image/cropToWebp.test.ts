/**
 * @jest-environment jsdom
 */
import { AVATAR_OUTPUT_SIZE_PX, avatarOutputSize, cropToWebpBlob } from '@/lib/image/cropToWebp'

describe('avatarOutputSize', () => {
	it.each([
		[2000, AVATAR_OUTPUT_SIZE_PX],
		[300, 300],
		[299.6, 300],
		[0.2, 1],
	])('área de %s px gera lado %s', (cropWidth, expected) => {
		expect(avatarOutputSize(cropWidth)).toBe(expected)
	})
})

describe('cropToWebpBlob', () => {
	it('recusa área vazia sem carregar a imagem', async () => {
		await expect(cropToWebpBlob('blob:x', { x: 0, y: 0, width: 0, height: 10 })).rejects.toThrow('CROP_FAILED')
	})

	it('desenha a área escolhida num canvas quadrado e codifica em WebP', async () => {
		const drawImage = jest.fn()
		const toBlob = jest.fn((callback: (blob: Blob | null) => void, type: string) =>
			callback(new Blob(['x'], { type }))
		)
		const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob }
		jest.spyOn(document, 'createElement').mockReturnValueOnce(canvas as never)
		class FakeImage {
			listeners: Record<string, () => void> = {}
			addEventListener(name: string, listener: () => void) {
				this.listeners[name] = listener
			}
			set src(_value: string) {
				queueMicrotask(() => this.listeners.load?.())
			}
		}
		const original = globalThis.Image
		;(globalThis as { Image: unknown }).Image = FakeImage

		const blob = await cropToWebpBlob('blob:x', { x: 10, y: 20, width: 800, height: 800 })

		expect(canvas.width).toBe(AVATAR_OUTPUT_SIZE_PX)
		expect(canvas.height).toBe(AVATAR_OUTPUT_SIZE_PX)
		expect(drawImage).toHaveBeenCalledWith(expect.anything(), 10, 20, 800, 800, 0, 0, 512, 512)
		expect(blob.type).toBe('image/webp')
		;(globalThis as { Image: unknown }).Image = original
		jest.restoreAllMocks()
	})
})
