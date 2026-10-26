/**
 * Liga ou desliga uma feature flag (coleção `FeatureFlag`).
 *
 * Uso:
 *   npm run toggle-feature-flag -- <key> [--confirm]
 *
 * O app lê o registro mais recente da chave, então o script insere um registro novo com o valor
 * invertido (flag ausente conta como desligada, então a primeira execução liga). O histórico é mantido.
 * Em produção exige --confirm.
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { isProductionEnv } from './lib/operator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const TRUTHY_STRINGS = new Set(['true', '1'])
const OBJECT_VALUE_FIELDS = ['active', 'enabled', 'value']

/** Mesma regra de `src/utils/jsonValueToBoolean.ts`. */
function toBoolean(value) {
	if (value === null || value === undefined) return false
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value !== 0
	if (typeof value === 'string') return TRUTHY_STRINGS.has(value.trim().toLowerCase())
	if (typeof value === 'object' && !Array.isArray(value)) {
		const field = OBJECT_VALUE_FIELDS.find((name) => name in value)
		return field ? toBoolean(value[field]) : false
	}
	return false
}

const confirm = process.argv.includes('--confirm')
const key = process.argv
	.slice(2)
	.filter((arg) => arg !== '--confirm')[0]
	?.trim()

async function main() {
	if (!key) {
		console.error('Usage: npm run toggle-feature-flag -- <key> [--confirm]')
		process.exit(1)
	}
	if (isProductionEnv() && !confirm) {
		console.error('Production environment: pass --confirm to write.')
		process.exit(1)
	}

	const prisma = new PrismaClient()
	try {
		const latest = await prisma.featureFlag.findFirst({
			where: { key },
			orderBy: { createdAt: 'desc' },
			select: { value: true },
		})
		const current = toBoolean(latest?.value)
		const next = !current
		await prisma.featureFlag.create({ data: { key, value: next } })
		console.log(
			`Feature flag "${key}": ${current ? 'ON' : 'OFF'} -> ${next ? 'ON' : 'OFF'}${latest ? '' : ' (new)'}`
		)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
