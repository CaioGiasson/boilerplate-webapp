/**
 * Regras do `init-project` (CommonJS, sem TypeScript): renomeia o boilerplate para o sistema novo.
 * Funções puras; a leitura/escrita de arquivos fica em `scripts/init-project.mjs`.
 * Testado em `tests/scripts/initProject.test.ts`.
 */
const { randomBytes } = require('node:crypto')

const DEFAULT_SLUG = 'boilerplate-webapp'
const DEFAULT_PRIVACY_OFFICER = 'Caio Felipe Giasson'
const DEFAULT_PRIVACY_EMAIL = 'cainitech@gmail.com'

const MONGO_PASSWORD_PLACEHOLDER = 'change-me-generate-with-openssl-rand-base64-24'
const JWT_SECRET_PLACEHOLDER = 'change-me-in-production-use-a-long-random-string'

const LOCALES = ['pt', 'en', 'es']
const LEGAL_MARKDOWN_FILES = ['privacy', 'terms'].flatMap((doc) =>
	LOCALES.map((locale) => `content/legal/${doc}.${locale}.md`)
)
const LEGAL_FILES = ['src/constants/legal.ts', ...LEGAL_MARKDOWN_FILES]
const TEXT_CATALOGS = LOCALES.map((locale) => `src/constants/texts/${locale}.ts`)
const SLUG_FILES = [
	'src/config/env.ts',
	'tests/config/env.test.ts',
	'.env.example',
	'deploy/cron/cronjob-retention-purge.yaml',
	'scripts/cron/run.mjs',
]

/**
 * @param {string} name
 * @returns {string} slug minúsculo, sem acentos, com hífens
 */
function slugify(name) {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

/** @param {string} value */
function escapeSingleQuoted(value) {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * @typedef {{ file: string, pattern: RegExp, replace: (match: string, ...groups: string[]) => string }} Rule
 */

/**
 * @param {{ name: string, slug: string, privacyOfficer?: string, privacyEmail?: string }} options
 * @returns {Rule[]}
 */
function buildRules({ name, slug, privacyOfficer, privacyEmail }) {
	/** @type {Rule[]} */
	const rules = [
		{ file: 'package.json', pattern: /"name": "boilerplate-webapp"/, replace: () => `"name": "${slug}"` },
		{ file: 'package-lock.json', pattern: /"name": "boilerplate-webapp"/g, replace: () => `"name": "${slug}"` },
		{
			file: 'src/constants/app.ts',
			pattern: /APP_NAME = 'App'/,
			replace: () => `APP_NAME = '${escapeSingleQuoted(name)}'`,
		},
		...TEXT_CATALOGS.map((file) => ({
			file,
			pattern: /(app: \{\s*name: )'App'/,
			replace: (_match, prefix) => `${prefix}'${escapeSingleQuoted(name)}'`,
		})),
		...SLUG_FILES.map((file) => ({ file, pattern: new RegExp(DEFAULT_SLUG, 'g'), replace: () => slug })),
		{ file: 'README.md', pattern: /^# Boilerplate Webapp$/m, replace: () => `# ${name}` },
		{
			file: '.env.example',
			pattern: /EMAIL_FROM_NAME="App"/,
			replace: () => `EMAIL_FROM_NAME="${name.replace(/"/g, '')}"`,
		},
		...LEGAL_MARKDOWN_FILES.map((file) => ({ file, pattern: /\bApp\b/g, replace: () => name })),
	]

	if (privacyOfficer) {
		for (const file of LEGAL_FILES) {
			rules.push({ file, pattern: new RegExp(DEFAULT_PRIVACY_OFFICER, 'g'), replace: () => privacyOfficer })
		}
	}
	if (privacyEmail) {
		for (const file of LEGAL_FILES) {
			rules.push({ file, pattern: /cainitech@gmail\.com/g, replace: () => privacyEmail })
		}
	}

	return rules
}

/**
 * Aplica as regras em memória.
 * @param {(file: string) => string | null} readFile devolve `null` quando o arquivo não existe
 * @param {Rule[]} rules
 * @returns {{ changed: Map<string, string>, unmatched: Array<{ file: string, pattern: string }>, missing: string[] }}
 */
function applyRules(readFile, rules) {
	/** @type {Map<string, string>} */
	const current = new Map()
	/** @type {Map<string, string>} */
	const original = new Map()
	/** @type {string[]} */
	const missing = []
	/** @type {Array<{ file: string, pattern: string }>} */
	const unmatched = []

	for (const rule of rules) {
		if (!current.has(rule.file)) {
			const content = readFile(rule.file)
			if (content === null) {
				if (!missing.includes(rule.file)) missing.push(rule.file)
				continue
			}
			current.set(rule.file, content)
			original.set(rule.file, content)
		}
		const before = current.get(rule.file)
		if (before === undefined) continue
		const after = before.replace(rule.pattern, rule.replace)
		if (after === before) {
			unmatched.push({ file: rule.file, pattern: String(rule.pattern) })
		}
		current.set(rule.file, after)
	}

	/** @type {Map<string, string>} */
	const changed = new Map()
	for (const [file, content] of current) {
		if (content !== original.get(file)) changed.set(file, content)
	}
	return { changed, unmatched, missing }
}

/**
 * Gera o conteúdo do `.env` a partir do `.env.example`, trocando só os placeholders de segredo.
 * @param {string} example
 * @param {(bytes: number) => string} [random] base64url de N bytes aleatórios
 */
function generateEnvFromExample(example, random = (bytes) => randomBytes(bytes).toString('base64url')) {
	return example.split(MONGO_PASSWORD_PLACEHOLDER).join(random(24)).split(JWT_SECRET_PLACEHOLDER).join(random(48))
}

module.exports = {
	DEFAULT_PRIVACY_OFFICER,
	DEFAULT_PRIVACY_EMAIL,
	slugify,
	buildRules,
	applyRules,
	generateEnvFromExample,
}
