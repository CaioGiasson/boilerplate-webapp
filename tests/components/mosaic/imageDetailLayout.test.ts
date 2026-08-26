import {
	IMAGE_DETAIL_DEFAULT_SIDE_PX,
	IMAGE_DETAIL_MIN_HEIGHT_PX,
	IMAGE_DETAIL_PANEL_WIDTH_PX,
	computeImageDetailLayout,
} from '@/components/mosaic/imageDetailLayout'

describe('computeImageDetailLayout', () => {
	it('grows a very wide landscape so image and modal are at least 400px tall', () => {
		const layout = computeImageDetailLayout({
			naturalWidth: 2400,
			naturalHeight: 300,
			maxWidth: 960,
			maxHeight: 800,
		})

		expect(layout.imageHeight).toBeGreaterThanOrEqual(IMAGE_DETAIL_MIN_HEIGHT_PX)
		expect(layout.modalHeight).toBeGreaterThanOrEqual(IMAGE_DETAIL_MIN_HEIGHT_PX)
		expect(layout.imageWidth).toBe(Math.round((IMAGE_DETAIL_MIN_HEIGHT_PX * 2400) / 300))
		expect(layout.modalWidth).toBe(layout.imageWidth + IMAGE_DETAIL_PANEL_WIDTH_PX)
	})

	it('does not grow landscape height past the viewport maxHeight', () => {
		const layout = computeImageDetailLayout({
			naturalWidth: 2400,
			naturalHeight: 300,
			maxWidth: 960,
			maxHeight: 280,
		})

		expect(layout.imageHeight).toBeLessThanOrEqual(280)
		expect(layout.modalHeight).toBe(layout.imageHeight)
	})

	it('keeps a landscape image that is already at least 400px tall', () => {
		const layout = computeImageDetailLayout({
			naturalWidth: 800,
			naturalHeight: 500,
			defaultSide: 800,
			maxWidth: 2000,
			maxHeight: 800,
		})

		expect(layout.imageWidth).toBe(800)
		expect(layout.imageHeight).toBe(500)
	})

	it('does not apply the landscape min-height to squares', () => {
		const layout = computeImageDetailLayout({
			naturalWidth: 400,
			naturalHeight: 400,
			maxWidth: 1600,
			maxHeight: 800,
		})

		expect(layout.imageWidth).toBe(IMAGE_DETAIL_DEFAULT_SIDE_PX)
		expect(layout.imageHeight).toBe(IMAGE_DETAIL_DEFAULT_SIDE_PX)
	})
})
