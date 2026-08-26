import { DEFAULT_MAX_SCROLLS, DEFAULT_STABLE_ROUNDS } from './constants.mjs'
import { logStep, sleep } from './log.mjs'
import { collectBoardsFromJson, pinImageUrl, walkPins } from './pins.mjs'

/**
 * @param {import('puppeteer').Page} page
 * @param {string} origin
 * @param {string} username
 */
export async function listUserBoards(page, origin, username) {
	/** @type {Map<string, { id: string, name: string, url: string, pinCount: number | null }>} */
	const boards = new Map()

	logStep('BOARDS', `Iniciando listagem de boards de @${username}`)

	page.on('response', async (response) => {
		try {
			const url = response.url()
			if (!url.includes('/resource/') && !url.includes('BoardsResource') && !url.includes('UserProfileBoards')) {
				if (!url.includes('Board') && !url.includes('boards')) {
					return
				}
			}
			if (response.status() < 200 || response.status() >= 300) {
				return
			}
			const contentType = response.headers()['content-type'] || ''
			if (!contentType.includes('json') && !url.includes('/resource/')) {
				return
			}
			const text = await response.text()
			if (!text.includes(username) && !text.includes('"type":"board"')) {
				return
			}
			const before = boards.size
			try {
				collectBoardsFromJson(JSON.parse(text), username, boards)
			} catch {
				/* ignore */
			}
			if (boards.size > before) {
				logStep(
					'BOARDS',
					`API retornou boards novos (+${boards.size - before}) — total parcial: ${boards.size}`
				)
			}
		} catch {
			/* ignore */
		}
	})

	const candidates = [`${origin}/${username}/_created/`, `${origin}/${username}/boards/`, `${origin}/${username}/`]

	for (const startUrl of candidates) {
		logStep('BOARDS', `Navegando para ${startUrl}`)
		await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 90_000 })
		logStep('BOARDS', 'Página carregada; verificando autenticação...')

		const authenticated = await page.evaluate(() => document.cookie.split('; ').some((c) => c === '_auth=1'))
		if (!authenticated) {
			throw new Error(
				'Sessão Pinterest não autenticada. Use PINTEREST_COOKIES só neste script de operador (arquivo local gitignored), nunca na app Next.'
			)
		}
		logStep('BOARDS', 'Sessão autenticada (_auth=1)')

		let stable = 0
		let previous = boards.size
		for (let i = 0; i < 40; i++) {
			await page.evaluate(() => {
				window.scrollBy(0, Math.max(window.innerHeight * 2.5, 1500))
				window.scrollTo(0, document.documentElement.scrollHeight)
			})
			await sleep(900 + Math.random() * 500)
			await page.waitForNetworkIdle({ idleTime: 600, timeout: 6_000 }).catch(() => {})

			const fromDom = await page.evaluate((user) => {
				/** @type {{ id: string, name: string, url: string, pinCount: number | null }[]} */
				const found = []
				const anchors = Array.from(document.querySelectorAll('a[href]'))
				for (const a of anchors) {
					const href = a.getAttribute('href') || ''
					const match = href.match(new RegExp(`^/${user}/([^/]+)/?$`, 'i'))
					if (!match) {
						continue
					}
					const slug = match[1]
					if (slug.startsWith('_') || slug === 'pins' || slug === 'boards') {
						continue
					}
					const name =
						a.getAttribute('title') ||
						a.querySelector('div[title]')?.getAttribute('title') ||
						a.textContent?.trim() ||
						slug
					found.push({
						id: slug,
						name: name.split('\n')[0].trim() || slug,
						url: `/${user}/${slug}/`,
						pinCount: null,
					})
				}
				return found
			}, username)

			let addedFromDom = 0
			for (const board of fromDom) {
				const key = board.url
				if (!boards.has(key)) {
					boards.set(key, board)
					addedFromDom += 1
				}
			}

			logStep(
				'BOARDS',
				`Scroll ${i + 1}/40 — boards: ${boards.size}` +
					(boards.size > previous ? ` (+${boards.size - previous})` : ' (sem novos)') +
					(addedFromDom ? ` [DOM +${addedFromDom}]` : '')
			)

			if (boards.size === previous) {
				stable += 1
			} else {
				stable = 0
				previous = boards.size
			}
			if (stable >= 3 && boards.size > 0) {
				logStep('BOARDS', `Listagem estabilizou após ${i + 1} scrolls (${boards.size} boards)`)
				break
			}
		}

		if (boards.size > 0) {
			logStep('BOARDS', `Usando resultados de ${startUrl}`)
			break
		}
		logStep('BOARDS', `Nenhum board em ${startUrl}; tentando próxima URL...`)
	}

	return Array.from(boards.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt'))
}

/**
 * @param {import('puppeteer').Page} page
 * @param {string} origin
 * @param {{ name: string, url: string, pinCount: number | null }} board
 */
export async function scrapeBoardImages(page, origin, board) {
	/** @type {Set<string>} */
	const imageUrls = new Set()
	let lastBookmark = /** @type {string | null} */ (null)
	let feedPages = 0

	logStep(
		'COLETA',
		`Abrindo board "${board.name}" (${origin}${decodeURIComponent(board.url)})` +
			(board.pinCount != null ? ` — ${board.pinCount} pins declarados` : '')
	)

	const onResponse = async (/** @type {import('puppeteer').HTTPResponse} */ response) => {
		try {
			const url = response.url()
			if (!url.includes('BoardFeedResource')) {
				return
			}
			if (response.status() < 200 || response.status() >= 300) {
				return
			}
			const text = await response.text()
			if (!text.includes('i.pinimg.com') && !text.includes('"type":"pin"')) {
				return
			}
			const json = JSON.parse(text)
			const before = imageUrls.size
			walkPins(json, (pin) => {
				const imageUrl = pinImageUrl(pin)
				if (imageUrl) {
					imageUrls.add(imageUrl)
				}
			})
			feedPages += 1
			lastBookmark = json?.resource?.nextBookmark || json?.resource_response?.bookmark || lastBookmark
			const added = imageUrls.size - before
			logStep(
				'COLETA',
				`"${board.name}" feed #${feedPages} — +${added} (total ${imageUrls.size})` +
					(lastBookmark === '-end-' ? ' [fim do feed]' : '')
			)
		} catch {
			/* ignore */
		}
	}

	page.on('response', onResponse)

	try {
		await page.goto(`${origin}${board.url}`, {
			waitUntil: 'networkidle2',
			timeout: 90_000,
		})
		logStep('COLETA', `"${board.name}" carregado — iniciando scroll/paginação`)

		let stableRounds = 0
		let previousCount = imageUrls.size

		for (let i = 0; i < DEFAULT_MAX_SCROLLS; i++) {
			await page.evaluate(() => {
				window.scrollBy(0, Math.max(window.innerHeight * 2.5, 1500))
				window.scrollTo(0, document.documentElement.scrollHeight)
			})
			await sleep(1000 + Math.random() * 600)
			await page.waitForNetworkIdle({ idleTime: 700, timeout: 8_000 }).catch(() => {})

			const count = imageUrls.size
			const delta = count - previousCount
			logStep(
				'COLETA',
				`"${board.name}" scroll ${i + 1}/${DEFAULT_MAX_SCROLLS} — ${count} imgs` +
					(delta > 0 ? ` (+${delta})` : ' (sem novos)') +
					(stableRounds > 0 ? ` [estável ${stableRounds}/${DEFAULT_STABLE_ROUNDS}]` : '')
			)

			if (lastBookmark === '-end-') {
				logStep('COLETA', `"${board.name}" — bookmark -end-; encerrando`)
				break
			}
			if (board.pinCount != null && count >= board.pinCount && count > 0) {
				logStep('COLETA', `"${board.name}" — atingiu contagem declarada (${count}/${board.pinCount})`)
				break
			}
			if (count === previousCount) {
				stableRounds += 1
			} else {
				stableRounds = 0
			}
			previousCount = count
			if (stableRounds >= DEFAULT_STABLE_ROUNDS) {
				logStep('COLETA', `"${board.name}" — estabilizou sem pins novos (${DEFAULT_STABLE_ROUNDS} rounds)`)
				break
			}
		}
	} finally {
		page.off('response', onResponse)
	}

	logStep('COLETA', `"${board.name}" concluído — ${imageUrls.size} URLs`)
	return Array.from(imageUrls)
}
