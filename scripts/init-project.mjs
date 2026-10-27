/**
 * Renomeia o boilerplate para o sistema novo (nome, slug, JWT issuer/audience, textos legais) e,
 * opcionalmente, gera o `.env` com segredos aleatórios.
 *
 * Uso:
 *   npm run init-project -- --name "Meu Sistema" [--slug meu-sistema] [--privacy-officer "Fulano"] \
 *       [--privacy-email privacidade@exemplo.com] [--env] [--confirm]
 *
 * Sem --confirm só mostra o que mudaria (dry-run). Roda uma vez, logo depois de clonar: não é para produção.
 * O `.env` só é criado se ainda não existir (nunca sobrescreve). Revise os textos jurídicos depois.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { refuseIfProduction } from './lib/operator.mjs'

const require = createRequire(import.meta.url)
const {
	DEFAULT_PRIVACY_EMAIL,
	DEFAULT_PRIVACY_OFFICER,
	slugify,
	buildRules,
	applyRules,
	generateEnvFromExample,
} = require('./lib/initProject.cjs')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const USAGE =
	'Usage: npm run init-project -- --name "Meu Sistema" [--slug meu-sistema] [--privacy-officer "Nome"] [--privacy-email a@b.c] [--env] [--confirm]'

function option(flag) {
	const index = process.argv.indexOf(flag)
	return index >= 0 ? process.argv[index + 1]?.trim() : undefined
}

function main() {
	refuseIfProduction()

	const name = option('--name')
	if (!name || name.startsWith('--')) {
		console.error(USAGE)
		process.exit(1)
	}
	const slug = option('--slug') ?? slugify(name)
	if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
		console.error(`Slug inválido: "${slug}". Use letras minúsculas, dígitos e hífen (ou informe --slug).`)
		process.exit(1)
	}
	const confirm = process.argv.includes('--confirm')
	const withEnv = process.argv.includes('--env')
	const privacyOfficer = option('--privacy-officer')
	const privacyEmail = option('--privacy-email')

	const readFile = (file) => (existsSync(resolve(root, file)) ? readFileSync(resolve(root, file), 'utf8') : null)
	const { changed, unmatched, missing } = applyRules(
		readFile,
		buildRules({ name, slug, privacyOfficer, privacyEmail })
	)

	console.log(`${confirm ? 'Aplicando' : 'Dry-run:'} nome="${name}" slug="${slug}"`)
	for (const [file, content] of changed) {
		console.log(`  ${confirm ? 'alterado' : 'alteraria'}: ${file}`)
		if (confirm) writeFileSync(resolve(root, file), content)
	}
	for (const file of missing) console.warn(`  ausente: ${file}`)
	if (unmatched.length > 0) {
		console.warn(`  ${unmatched.length} regra(s) sem correspondência (já aplicadas antes ou arquivo mudou).`)
	}

	if (withEnv) {
		const envPath = resolve(root, '.env')
		const examplePath = resolve(root, '.env.example')
		if (existsSync(envPath)) {
			console.log('  .env já existe: mantido.')
		} else if (!existsSync(examplePath)) {
			console.warn('  .env.example ausente: .env não criado.')
		} else {
			console.log(`  ${confirm ? 'criado' : 'criaria'}: .env (segredos aleatórios)`)
			if (confirm) {
				writeFileSync(envPath, generateEnvFromExample(readFileSync(examplePath, 'utf8')), { mode: 0o600 })
			}
		}
	}

	if (!privacyOfficer || !privacyEmail) {
		console.warn(
			`\nAtenção: encarregado e e-mail de privacidade continuam "${DEFAULT_PRIVACY_OFFICER}" / "${DEFAULT_PRIVACY_EMAIL}" nos textos legais.` +
				'\nInforme --privacy-officer e --privacy-email, e peça revisão jurídica dos termos e da política.'
		)
	}
	if (!confirm) {
		console.log('\nNada foi gravado. Rode de novo com --confirm para aplicar.')
		return
	}
	console.log(
		'\nPróximos passos: npm run mongo:keyfile · docker compose up -d · npm run prisma:push · npm run seed:dev · npm run pwa:icons'
	)
}

main()
