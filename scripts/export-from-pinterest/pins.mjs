import { slugifyBoardName } from './naming.mjs'

/**
 * @param {unknown} pin
 * @returns {string | null}
 */
export function pinImageUrl(pin) {
	if (!pin || typeof pin !== 'object') {
		return null
	}
	const images = /** @type {{ images?: Record<string, { url?: string }> }} */ (pin).images
	if (!images) {
		return null
	}
	return images.orig?.url || images['736x']?.url || images['474x']?.url || images['236x']?.url || null
}

/**
 * @param {unknown} value
 * @param {(pin: object) => void} onPin
 */
export function walkPins(value, onPin) {
	if (!value || typeof value !== 'object') {
		return
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			walkPins(item, onPin)
		}
		return
	}
	const obj = /** @type {Record<string, unknown>} */ (value)
	if ((obj.type === 'pin' || obj.images) && obj.images) {
		onPin(obj)
	}
	for (const nested of Object.values(obj)) {
		walkPins(nested, onPin)
	}
}

/**
 * @param {unknown} value
 * @param {string} username
 * @param {Map<string, { id: string, name: string, url: string, pinCount: number | null }>} boards
 */
export function collectBoardsFromJson(value, username, boards) {
	if (!value || typeof value !== 'object') {
		return
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			collectBoardsFromJson(item, username, boards)
		}
		return
	}

	const obj = /** @type {Record<string, unknown>} */ (value)
	const type = obj.type
	const url = typeof obj.url === 'string' ? obj.url : ''
	const name = typeof obj.name === 'string' ? obj.name : ''
	const id = obj.id != null ? String(obj.id) : ''

	const looksLikeBoard =
		type === 'board' ||
		(url.includes(`/${username}/`) &&
			name &&
			id &&
			!url.includes('/pin/') &&
			(obj.pin_count != null || obj.pinCount != null || obj.privacy != null))

	if (looksLikeBoard && id && name) {
		let boardPath = url
		if (!boardPath.startsWith('/')) {
			try {
				boardPath = new URL(boardPath, 'https://pinterest.com').pathname
			} catch {
				boardPath = `/${username}/${slugifyBoardName(name)}/`
			}
		}
		boardPath = decodeURIComponent(boardPath)
		if (boardPath.startsWith(`/${username}/`)) {
			if (!boardPath.endsWith('/')) {
				boardPath += '/'
			}
			const pinCountRaw = obj.pin_count ?? obj.pinCount
			const key = boardPath
			boards.set(key, {
				id,
				name,
				url: boardPath,
				pinCount: typeof pinCountRaw === 'number' ? pinCountRaw : null,
			})
		}
	}

	for (const nested of Object.values(obj)) {
		collectBoardsFromJson(nested, username, boards)
	}
}
