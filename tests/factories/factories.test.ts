import { FileStatus } from '@prisma/client'
import { buildFile, buildSessionClaims, buildVerifiedSession } from '../factories'

describe('test factories', () => {
	it('buildFile defaults to published with Spaces-like URL', () => {
		const file = buildFile({ ownerId: 'u1' })
		expect(file.status).toBe(FileStatus.published)
		expect(file.key).toContain('u1/')
		expect(file.url).toContain(file.key)
	})

	it('buildVerifiedSession includes claims', () => {
		const session = buildVerifiedSession({ userId: 'u2' })
		expect(session.userId).toBe('u2')
		expect(buildSessionClaims().device).toMatch(/^[0-9a-f-]{36}$/i)
		expect(session.token).toBeTruthy()
		expect(session.jti).toBeTruthy()
	})
})
