/** Full HD reference: 6 columns → target tile width for the masonry. */
export const MOSAIC_FULL_HD_WIDTH_PX = 1920
export const MOSAIC_FULL_HD_COLUMNS = 6
export const MOSAIC_COLUMN_WIDTH_PX = MOSAIC_FULL_HD_WIDTH_PX / MOSAIC_FULL_HD_COLUMNS
export const MOSAIC_COLUMN_GAP_PX = 12

/** How many equal-width columns fit in the available container width. */
export function getMosaicColumnCount(containerWidthPx: number, gapPx = MOSAIC_COLUMN_GAP_PX): number {
	if (containerWidthPx <= 0) return 1
	return Math.max(1, Math.floor((containerWidthPx + gapPx) / (MOSAIC_COLUMN_WIDTH_PX + gapPx)))
}
