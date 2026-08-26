/**
 * Backfill de nicknames para forma canônica (NFC + lowercase + strip invisíveis).
 * Espelha `canonicalizeNickname` em `src/utils/nickname.ts` — manter em sync.
 *
 * Uso:
 *   npm run nickname:backfill -- --dry-run
 *   npm run nickname:backfill -- --confirm
 *
 * Colisões (ex. Admin + admin): o registro mais antigo (createdAt) fica com o
 * canônico; os demais são renomeados para `rn_{id}` (≤32 chars, charset válido)
 * para o titular trocar no perfil. Documentar colisões no PR / runbook.
 */
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const dryRun = process.argv.includes('--dry-run')
const confirm = process.argv.includes('--confirm')

const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g

/**
 * @param {string} raw
 */
function canonicalizeNickname(raw) {
	return raw.trim().normalize('NFC').replace(INVISIBLE_CHARS, '').toLocaleLowerCase('en-US')
}

async function main() {
	if (!dryRun && !confirm) {
		console.error('Refusing to run without --confirm (or use --dry-run).')
		console.error('Example: npm run nickname:backfill -- --dry-run')
		process.exit(1)
	}

	const prisma = new PrismaClient()

	try {
		const users = await prisma.user.findMany({
			where: {
				OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
			},
			select: { id: true, nickname: true, createdAt: true },
			orderBy: { createdAt: 'asc' },
		})

		/** @type {Map<string, typeof users>} */
		const byCanonical = new Map()
		for (const user of users) {
			const canonical = canonicalizeNickname(user.nickname)
			const group = byCanonical.get(canonical) ?? []
			group.push(user)
			byCanonical.set(canonical, group)
		}

		const safeUpdates = []
		const collisions = []

		for (const [canonical, group] of byCanonical.entries()) {
			if (!canonical) {
				console.warn(`[skip] empty canonical for ids=${group.map((u) => u.id).join(',')}`)
				continue
			}

			if (group.length === 1) {
				const [user] = group
				if (user.nickname !== canonical) {
					safeUpdates.push({ id: user.id, from: user.nickname, to: canonical })
				}
				continue
			}

			const [keeper, ...losers] = group
			collisions.push({
				canonical,
				keeper: { id: keeper.id, nickname: keeper.nickname },
				losers: losers.map((u) => ({ id: u.id, nickname: u.nickname })),
			})
		}

		console.log(`Active users: ${users.length}`)
		console.log(`Safe canonical updates: ${safeUpdates.length}`)
		console.log(`Collision groups: ${collisions.length}`)
		console.log(dryRun ? 'Mode: dry-run' : 'Mode: confirm')

		for (const row of safeUpdates) {
			console.log(`[update] ${row.id}: ${JSON.stringify(row.from)} → ${JSON.stringify(row.to)}`)
		}

		for (const group of collisions) {
			console.log(
				`[collision] canonical=${JSON.stringify(group.canonical)} keeper=${group.keeper.id}(${group.keeper.nickname}) losers=${group.losers.map((l) => `${l.id}(${l.nickname})`).join(', ')}`
			)
		}

		if (dryRun) {
			return
		}

		for (const row of safeUpdates) {
			await prisma.user.update({
				where: { id: row.id },
				data: { nickname: row.to },
			})
		}

		for (const group of collisions) {
			for (const loser of group.losers) {
				const temporary = `rn_${loser.id}`
				await prisma.user.update({
					where: { id: loser.id },
					data: { nickname: temporary },
				})
				console.log(`[rename-loser] ${loser.id}: ${loser.nickname} → ${temporary}`)
			}
			if (group.keeper.nickname !== group.canonical) {
				await prisma.user.update({
					where: { id: group.keeper.id },
					data: { nickname: group.canonical },
				})
				console.log(`[keeper] ${group.keeper.id}: ${group.keeper.nickname} → ${group.canonical}`)
			}
		}

		console.log('Backfill complete.')
	} finally {
		await prisma.$disconnect()
	}
}

main().catch((error) => {
	console.error('Nickname backfill failed')
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
