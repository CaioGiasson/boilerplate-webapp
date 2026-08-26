import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { COOKIES_PATH } from './constants.mjs'

/**
 * @param {import('puppeteer').Page} page
 * @param {string} origin
 */
export async function applyStoredCookies(page, origin) {
	const fromEnv = process.env.PINTEREST_COOKIES?.trim()
	/** @type {{ name: string, value: string }[]} */
	let cookies = []

	if (fromEnv) {
		cookies = fromEnv.split(';').map((part) => {
			const [name, ...rest] = part.trim().split('=')
			return { name: name.trim(), value: rest.join('=').trim() }
		})
	} else if (existsSync(COOKIES_PATH)) {
		const stored = JSON.parse(readFileSync(COOKIES_PATH, 'utf8'))
		cookies = stored.map((/** @type {{ name: string, value: string }} */ c) => ({
			name: c.name,
			value: c.value,
		}))
	}

	cookies = cookies.filter((c) => c.name && c.value)
	if (cookies.length === 0) {
		return false
	}

	await page.setCookie(
		...cookies.map((c) => ({
			name: c.name,
			value: c.value,
			url: origin,
			path: '/',
		}))
	)
	return true
}

/**
 * @param {import('puppeteer').Page} page
 */
export async function persistCookies(page) {
	const cookies = await page.cookies()
	const relevant = cookies.filter((c) => c.domain.includes('pinterest.com') || c.domain.includes('pinimg.com'))
	writeFileSync(COOKIES_PATH, JSON.stringify(relevant, null, 2))
}
