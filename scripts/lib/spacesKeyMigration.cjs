const { randomBytes } = require('node:crypto')

/** @type {RegExp} */
const LEGACY_KEY_PATTERN = /^(dev|prod|test)\/(images|avatars)\/[^/]+\.[A-Za-z0-9]+$/

/**
 * @param {string} key
 * @returns {{ env: string, category: string, extension: string } | null}
 */
function parseLegacyKey(key) {
	const match = key.match(/^(dev|prod|test)\/(images|avatars)\/[^/]+\.([A-Za-z0-9]+)$/)
	if (!match) {
		return null
	}
	return { env: match[1], category: match[2], extension: match[3].toLowerCase() }
}

/**
 * @param {string} ownerId
 * @param {string} category
 * @param {string} extension
 * @param {() => string} [randomHex32]
 */
function buildNewKey(ownerId, category, extension, randomHex32) {
	const suffix = typeof randomHex32 === 'function' ? randomHex32() : randomBytes(16).toString('hex')
	return `${ownerId}/${category}/${suffix}.${extension}`
}

/**
 * @param {string} baseUrl
 * @param {string} key
 */
function buildCanonicalUrl(baseUrl, key) {
	return `${baseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}

module.exports = {
	LEGACY_KEY_PATTERN,
	parseLegacyKey,
	buildNewKey,
	buildCanonicalUrl,
}
