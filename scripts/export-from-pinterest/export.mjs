import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-extra'
import { BOARD_DELAY_MS, DOWNLOAD_DELAY_MS, EXPORTS_ROOT } from './constants.mjs'
import { applyStoredCookies, persistCookies } from './cookies.mjs'
import { createPage } from './browser.mjs'
import { listUserBoards, scrapeBoardImages } from './boards.mjs'
import { downloadImage } from './download.mjs'
import { endProgressLine, logStep, renderProgressBar, sleep } from './log.mjs'
import { boardFileSlug, buildExportFileName, parseProfileUrl, toOriginalUrl } from './naming.mjs'

/**
 * @param {string} profileUrl
 * @param {{ testMode?: boolean }} [opts]
 */
export async function exportFromPinterest(profileUrl, opts = {}) {
	const testMode = Boolean(opts.testMode)
	const { origin, username } = parseProfileUrl(profileUrl)

	logStep('INÍCIO', `export-from-pinterest → @${username}`)
	logStep('INÍCIO', `Perfil: ${profileUrl}`)
	logStep('INÍCIO', `Modo: ${testMode ? '-test (sem download completo)' : 'completo (coleta + download)'}`)

	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	})
	logStep('INÍCIO', 'Navegador headless iniciado')

	try {
		const page = await createPage(browser, origin)
		const hadCookies = await applyStoredCookies(page, origin)
		logStep(
			'SESSÃO',
			hadCookies
				? 'Cookies carregados (.env PINTEREST_COOKIES ou .pinterest-cookies.json)'
				: 'Sem cookies — boards completos provavelmente falharão'
		)

		logStep('ETAPA 1/4', 'Listar boards do usuário')
		const boards = (await listUserBoards(page, origin, username)).filter((board) =>
			decodeURIComponent(board.url).startsWith(`/${username}/`)
		)
		if (boards.length === 0) {
			throw new Error(`Nenhum board encontrado para @${username}.`)
		}

		logStep('ETAPA 1/4', `${boards.length} boards do @${username}:`)
		for (const [index, board] of boards.entries()) {
			const countLabel = board.pinCount != null ? ` (${board.pinCount} pins)` : ''
			console.log(
				`  ${String(index + 1).padStart(2, '0')}. ${board.name}${countLabel} → ${decodeURIComponent(board.url)}`
			)
		}

		const boardsToScrape = testMode ? boards.slice(0, 1) : boards
		if (testMode) {
			logStep('ETAPA 2/4', `[-test] Coletando apenas o 1º board: "${boardsToScrape[0].name}"`)
		} else {
			logStep('ETAPA 2/4', `Coletar imagens de ${boardsToScrape.length} boards`)
		}

		/** @type {Map<string, { url: string, file: string, board: string }>} */
		const itemsByFile = new Map()

		for (let i = 0; i < boardsToScrape.length; i++) {
			const board = boardsToScrape[i]
			const slug = boardFileSlug(board)
			logStep('ETAPA 2/4', `Board ${i + 1}/${boardsToScrape.length}: "${board.name}" (slug=${slug})`)
			renderProgressBar(i, boardsToScrape.length, `coletando "${board.name}"`)

			const urls = await scrapeBoardImages(page, origin, board)
			let addedUnique = 0
			for (const rawUrl of urls) {
				const url = toOriginalUrl(rawUrl)
				const file = buildExportFileName(slug, url)
				if (!itemsByFile.has(file)) {
					itemsByFile.set(file, { url, file, board: board.name })
					addedUnique += 1
				}
			}

			endProgressLine()
			renderProgressBar(
				i + 1,
				boardsToScrape.length,
				`ok "${board.name}" (${urls.length} imgs, +${addedUnique} únicas)`
			)
			logStep(
				'ETAPA 2/4',
				`"${board.name}" → ${urls.length} URLs brutas, ${addedUnique} novas no manifest (acumulado ${itemsByFile.size})`
			)

			if (i < boardsToScrape.length - 1) {
				logStep('ETAPA 2/4', `Aguardando ${BOARD_DELAY_MS}ms antes do próximo board...`)
				await sleep(BOARD_DELAY_MS)
			}
		}

		logStep('SESSÃO', 'Persistindo cookies atualizados...')
		await persistCookies(page).catch(() => {})

		const items = Array.from(itemsByFile.values())

		logStep('ETAPA 3/4', `Montar manifest — ${items.length} itens { url, file }`)
		console.log(
			JSON.stringify(
				items.map(({ url, file }) => ({ url, file })),
				null,
				2
			)
		)

		if (testMode) {
			logStep('ETAPA 4/4', '[-test] Download ignorado')
			logStep('FIM', `Teste concluído — ${boards.length} boards listados, ${items.length} imagens no 1º board`)
			return { boards, items, downloaded: 0, testMode: true }
		}

		const outDir = resolve(EXPORTS_ROOT, username)
		mkdirSync(outDir, { recursive: true })
		logStep('ETAPA 4/4', `Download → ${outDir} (1 imagem/s)`)

		let downloaded = 0
		let skipped = 0
		let failed = 0
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			const dest = resolve(outDir, item.file)
			logStep(
				'DOWNLOAD',
				`${i + 1}/${items.length} ${item.file}` + (existsSync(dest) ? ' (já existe, pulando fetch)' : '')
			)
			renderProgressBar(i, items.length, item.file)
			try {
				if (existsSync(dest)) {
					skipped += 1
					downloaded += 1
				} else {
					await downloadImage(item.url, dest)
					downloaded += 1
					logStep('DOWNLOAD', `Salvo: ${dest}`)
				}
			} catch (err) {
				failed += 1
				const message = err instanceof Error ? err.message : String(err)
				endProgressLine()
				logStep('DOWNLOAD', `Falha em ${item.file}: ${message}`)
			}
			renderProgressBar(i + 1, items.length, item.file)
			if (i < items.length - 1) {
				await sleep(DOWNLOAD_DELAY_MS)
			}
		}

		logStep(
			'FIM',
			`Concluído — ${downloaded}/${items.length} ok` +
				(skipped ? `, ${skipped} já existiam` : '') +
				(failed ? `, ${failed} falhas` : '') +
				` → exports/${username}/`
		)
		return { boards, items, downloaded, testMode: false }
	} finally {
		logStep('INÍCIO', 'Fechando navegador...')
		await browser.close()
	}
}
