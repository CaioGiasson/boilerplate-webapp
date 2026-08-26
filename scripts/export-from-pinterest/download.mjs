import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

/**
 * @param {string} imageUrl
 * @param {string} destPath
 */
export async function downloadImage(imageUrl, destPath) {
	const res = await fetch(imageUrl, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Referer: 'https://www.pinterest.com/',
		},
	})
	if (!res.ok || !res.body) {
		throw new Error(`Download falhou (${res.status}) para ${imageUrl}`)
	}
	// @ts-expect-error Node fetch body is a web stream
	await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath))
}
