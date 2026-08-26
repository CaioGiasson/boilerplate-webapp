/**
 * Grandfather existing accounts: set emailVerifiedAt = createdAt when still null
 * and there is no outstanding email challenge.
 *
 * Usage: npm run email:backfill-verified
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	const users = await prisma.user.findMany({
		where: {
			OR: [{ emailVerifiedAt: null }, { emailVerifiedAt: { isSet: false } }],
		},
		select: {
			id: true,
			createdAt: true,
			emailTokenHash: true,
		},
	})

	let updated = 0
	for (const user of users) {
		if (user.emailTokenHash) {
			continue
		}
		await prisma.user.update({
			where: { id: user.id },
			data: { emailVerifiedAt: user.createdAt },
		})
		updated += 1
	}

	console.log(`Backfilled emailVerifiedAt for ${updated} user(s) (${users.length} candidate(s)).`)
}

main()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
