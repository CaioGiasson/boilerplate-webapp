/**
 * @param {string} profileUrl
 */
export function parseProfileUrl(profileUrl) {
	const url = new URL(profileUrl)
	const parts = url.pathname.split('/').filter(Boolean)
	if (parts.length < 1) {
		throw new Error('URL de perfil inválida. Esperado: https://pinterest.com/<username>/')
	}
	const username = parts[0]
	if (username.startsWith('_')) {
		throw new Error('URL de perfil inválida: falta o username.')
	}
	return {
		origin: `${url.protocol}//${url.host}`,
		username,
		profilePath: `/${username}/`,
		boardsPath: `/${username}/_created/`,
	}
}

/**
 * @param {string} name
 */
export function slugifyBoardName(name) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

/**
 * @param {string} imageUrl
 */
export function toOriginalUrl(imageUrl) {
	return imageUrl
		.replace(/\/\d+x\//, '/originals/')
		.replace(/\/\d+x\d+\//, '/originals/')
		.split('?')[0]
}

/**
 * @param {{ name: string, url: string }} board
 */
export function boardFileSlug(board) {
	const path = decodeURIComponent(board.url)
	const parts = path.split('/').filter(Boolean)
	const fromUrl = parts[1] || ''
	return slugifyBoardName(fromUrl) || slugifyBoardName(board.name) || 'board'
}

/**
 * @param {string} boardSlug
 * @param {string} imageUrl
 */
export function buildExportFileName(boardSlug, imageUrl) {
	const pathname = new URL(toOriginalUrl(imageUrl)).pathname
	const parts = pathname.split('/').filter(Boolean)
	const originalsIdx = parts.findIndex((p) => p === 'originals' || /^\d+x$/.test(p) || /^\d+x\d+$/.test(p))
	const rest = originalsIdx >= 0 ? parts.slice(originalsIdx + 1) : parts.slice(-4)
	const hashWithExt = rest.join('-')
	if (!hashWithExt) {
		const fallback = parts.at(-1) || 'image.jpg'
		return `${boardSlug}--${fallback}`
	}
	return `${boardSlug}--${hashWithExt}`
}
