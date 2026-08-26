import { refuseIfProduction } from '../lib/operator.mjs'
import { exportFromPinterest } from './export.mjs'

export function printUsage() {
	console.error(`Uso:
  npm run export-from-pinterest -- <URL_DO_PERFIL>
  npm run export-from-pinterest -- <URL_DO_PERFIL> -test

Exemplos:
  npm run export-from-pinterest -- https://br.pinterest.com/caiogiasson/
  npm run export-from-pinterest -- https://br.pinterest.com/caiogiasson/ -test

Ferramenta de operador local (não é feature da app). Cookies: PINTEREST_COOKIES no .env local ou .pinterest-cookies.json (gitignored). A Next app ignora esta variável.
`)
}

export async function main() {
	refuseIfProduction()

	const args = process.argv.slice(2).filter(Boolean)
	const testMode = args.includes('-test')
	const profileUrl = args.find((a) => a !== '-test' && a !== '--login')

	if (!profileUrl) {
		printUsage()
		process.exitCode = 1
		return
	}

	if (!/^https?:\/\/([a-z]+\.)?pinterest\.[a-z.]+\/[^/]+\/?/i.test(profileUrl)) {
		console.error('URL inválida: informe o link do perfil do Pinterest.')
		printUsage()
		process.exitCode = 1
		return
	}

	if (args.at(-1) === '-test' || testMode) {
		// ok — -test deve ser o último argumento conforme especificação
		if (args.at(-1) !== '-test') {
			console.warn('Aviso: prefira passar -test como último argumento.')
		}
	}

	await exportFromPinterest(profileUrl, { testMode })
}
