import {
	BOARD_ZOOM_DESKTOP_DEFAULT,
	BOARD_ZOOM_DESKTOP_MAX,
	BOARD_ZOOM_MOBILE_DEFAULT,
	BOARD_ZOOM_MOBILE_MAX,
	clampBoardZoom,
	getBoardZoomRange,
	resolveBoardZoomLevel,
} from '@/constants/boardZoom'
import { SETTINGS_KEYS } from '@/managers/Settings.manager'

describe('boardZoom', () => {
	it('expõe faixas e defaults desktop/mobile', () => {
		expect(getBoardZoomRange(false)).toEqual({
			min: 1,
			max: BOARD_ZOOM_DESKTOP_MAX,
			defaultValue: BOARD_ZOOM_DESKTOP_DEFAULT,
		})
		expect(getBoardZoomRange(true)).toEqual({
			min: 1,
			max: BOARD_ZOOM_MOBILE_MAX,
			defaultValue: BOARD_ZOOM_MOBILE_DEFAULT,
		})
	})

	it('faz clamp dentro da faixa e arredonda', () => {
		expect(clampBoardZoom(0, false)).toBe(1)
		expect(clampBoardZoom(99, false)).toBe(12)
		expect(clampBoardZoom(7.6, false)).toBe(8)
		expect(clampBoardZoom(12, true)).toBe(4)
		expect(clampBoardZoom(Number.NaN, true)).toBe(BOARD_ZOOM_MOBILE_DEFAULT)
	})

	it('resolve setting numérico, string ou inválido', () => {
		expect(resolveBoardZoomLevel(6, false)).toBe(6)
		expect(resolveBoardZoomLevel('3', true)).toBe(3)
		expect(resolveBoardZoomLevel('12', true)).toBe(4)
		expect(resolveBoardZoomLevel(undefined, false)).toBe(BOARD_ZOOM_DESKTOP_DEFAULT)
		expect(resolveBoardZoomLevel('abc', true)).toBe(BOARD_ZOOM_MOBILE_DEFAULT)
		expect(resolveBoardZoomLevel(null, false)).toBe(BOARD_ZOOM_DESKTOP_DEFAULT)
	})
})

describe('SETTINGS_KEYS board zoom', () => {
	it('define keys homeZoomLevel e imagesZoomLevel', () => {
		expect(SETTINGS_KEYS.HOME_ZOOM_LEVEL).toBe('homeZoomLevel')
		expect(SETTINGS_KEYS.IMAGES_ZOOM_LEVEL).toBe('imagesZoomLevel')
	})
})
