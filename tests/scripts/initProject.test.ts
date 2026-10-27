const { slugify, buildRules, applyRules, generateEnvFromExample } = require('../../scripts/lib/initProject.cjs')

const FILES: Record<string, string> = {
	'package.json': '{\n\t"name": "boilerplate-webapp",\n\t"version": "0.1.0"\n}',
	'package-lock.json': '{"name": "boilerplate-webapp", "packages": {"": {"name": "boilerplate-webapp"}}}',
	'src/constants/app.ts': "export const APP_NAME = 'App'\n",
	'src/constants/texts/pt.ts': "const pt = {\n\tapp: {\n\t\tname: 'App',\n\t\tclose: 'Fechar',\n\t},\n}",
	'src/config/env.ts': "const DEFAULT_JWT_ISSUER = 'boilerplate-webapp'\nconst AUD = 'boilerplate-webapp-web'",
	'README.md': '# Boilerplate Webapp\n\ntexto',
	'content/legal/terms.pt.md': 'O App não se obriga. Contato: **Caio Felipe Giasson** — cainitech@gmail.com.',
	'src/constants/legal.ts': "export const PRIVACY_OFFICER_NAME = 'Caio Felipe Giasson'",
}

const readFile = (file: string) => FILES[file] ?? null

describe('slugify', () => {
	it('remove acentos e normaliza separadores', () => {
		expect(slugify('Meu Sistema Ótimo!')).toBe('meu-sistema-otimo')
		expect(slugify('  --Já__Existe--  ')).toBe('ja-existe')
	})
})

describe('applyRules', () => {
	it('renomeia nome, slug e textos legais sem tocar no que não casa', () => {
		const rules = buildRules({
			name: "Loja d'Água",
			slug: 'loja-dagua',
			privacyOfficer: 'Maria',
			privacyEmail: 'dpo@loja.test',
		})

		const { changed, missing } = applyRules(readFile, rules)

		expect(changed.get('package.json')).toContain('"name": "loja-dagua"')
		expect(changed.get('package-lock.json')).toBe(
			'{"name": "loja-dagua", "packages": {"": {"name": "loja-dagua"}}}'
		)
		expect(changed.get('src/constants/app.ts')).toBe("export const APP_NAME = 'Loja d\\'Água'\n")
		expect(changed.get('src/constants/texts/pt.ts')).toContain("name: 'Loja d\\'Água',")
		expect(changed.get('src/config/env.ts')).toBe(
			"const DEFAULT_JWT_ISSUER = 'loja-dagua'\nconst AUD = 'loja-dagua-web'"
		)
		expect(changed.get('README.md')).toBe("# Loja d'Água\n\ntexto")
		expect(changed.get('content/legal/terms.pt.md')).toBe(
			"O Loja d'Água não se obriga. Contato: **Maria** — dpo@loja.test."
		)
		expect(changed.get('src/constants/legal.ts')).toBe("export const PRIVACY_OFFICER_NAME = 'Maria'")
		expect(missing).toContain('deploy/cron/cronjob-retention-purge.yaml')
	})

	it('não mexe nos dados de privacidade quando não são informados', () => {
		const { changed } = applyRules(readFile, buildRules({ name: 'X', slug: 'x' }))

		expect(changed.get('content/legal/terms.pt.md')).toContain('Caio Felipe Giasson')
		expect(changed.has('src/constants/legal.ts')).toBe(false)
	})

	it('é idempotente: segunda passada não altera nada', () => {
		const rules = buildRules({ name: 'Loja', slug: 'loja' })
		const first = applyRules(readFile, rules)
		const second = applyRules((file) => first.changed.get(file) ?? FILES[file] ?? null, rules)

		expect(second.changed.size).toBe(0)
		expect(second.unmatched.length).toBeGreaterThan(0)
	})

	it('não interpreta $ no nome como padrão de substituição', () => {
		const { changed } = applyRules(readFile, buildRules({ name: 'A$&B', slug: 'ab' }))

		expect(changed.get('README.md')).toBe('# A$&B\n\ntexto')
	})
})

describe('generateEnvFromExample', () => {
	it('troca os placeholders por segredos e mantém a senha do Mongo consistente na URL', () => {
		const example = [
			'MONGO_ROOT_PASSWORD="change-me-generate-with-openssl-rand-base64-24"',
			'DATABASE_URL="mongodb://mongo:change-me-generate-with-openssl-rand-base64-24@localhost:27717/mongo"',
			'JWT_SECRET="change-me-in-production-use-a-long-random-string"',
			'LOG_LEVEL=info',
		].join('\n')
		let calls = 0
		const result = generateEnvFromExample(example, (bytes: number) => `secret${bytes}-${calls++}`)

		expect(result).toContain('MONGO_ROOT_PASSWORD="secret24-0"')
		expect(result).toContain('mongodb://mongo:secret24-0@localhost')
		expect(result).toContain('JWT_SECRET="secret48-1"')
		expect(result).not.toContain('change-me')
	})
})
