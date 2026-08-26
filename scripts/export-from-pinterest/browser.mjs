import { applyStoredCookies } from './cookies.mjs'

/**
 * @param {import('puppeteer').Browser} browser
 * @param {string} origin
 */
export async function createPage(browser, origin) {
	const page = await browser.newPage()
	await page.setViewport({ width: 1400, height: 900 })
	await page.setUserAgent(
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
	)
	await applyStoredCookies(page, origin)
	return page
}
