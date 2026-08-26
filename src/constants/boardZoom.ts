/** Board zoom: column count ranges and defaults by viewport. */

export const BOARD_ZOOM_DESKTOP_MIN = 1
export const BOARD_ZOOM_DESKTOP_MAX = 12
export const BOARD_ZOOM_DESKTOP_DEFAULT = 4

export const BOARD_ZOOM_MOBILE_MIN = 1
export const BOARD_ZOOM_MOBILE_MAX = 4
export const BOARD_ZOOM_MOBILE_DEFAULT = 2

export const BOARD_ZOOM_MOBILE_MEDIA = '(max-width: 767px)'

export type BoardZoomRange = {
	min: number
	max: number
	defaultValue: number
}

export function getBoardZoomRange(isMobile: boolean): BoardZoomRange {
	if (isMobile) {
		return {
			min: BOARD_ZOOM_MOBILE_MIN,
			max: BOARD_ZOOM_MOBILE_MAX,
			defaultValue: BOARD_ZOOM_MOBILE_DEFAULT,
		}
	}

	return {
		min: BOARD_ZOOM_DESKTOP_MIN,
		max: BOARD_ZOOM_DESKTOP_MAX,
		defaultValue: BOARD_ZOOM_DESKTOP_DEFAULT,
	}
}

export function clampBoardZoom(value: number, isMobile: boolean): number {
	const { min, max, defaultValue } = getBoardZoomRange(isMobile)
	if (!Number.isFinite(value)) {
		return defaultValue
	}
	return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * Parses a setting value into a column count for the current viewport.
 * Invalid values fall back to the viewport default.
 */
export function resolveBoardZoomLevel(raw: unknown, isMobile: boolean): number {
	const { defaultValue } = getBoardZoomRange(isMobile)

	if (typeof raw === 'number') {
		return clampBoardZoom(raw, isMobile)
	}

	if (typeof raw === 'string' && raw.trim() !== '') {
		const parsed = Number(raw)
		if (Number.isFinite(parsed)) {
			return clampBoardZoom(parsed, isMobile)
		}
	}

	return defaultValue
}
