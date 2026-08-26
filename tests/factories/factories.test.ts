import { FileStatus } from '@prisma/client'
import { buildFile, buildReport, buildSessionClaims, buildVerifiedSession } from '../factories'

describe('test factories', () => {
	it('buildFile defaults to published with Spaces-like URL', () => {
		const file = buildFile({ ownerId: 'u1' })
		expect(file.status).toBe(FileStatus.published)
		expect(file.key).toContain('u1/')
		expect(file.url).toContain(file.key)
	})

	it('buildReport defaults to open spam', () => {
		const report = buildReport()
		expect(report.status).toBe('open')
		expect(report.reason).toBe('spam')
	})

	it('buildVerifiedSession includes claims', () => {
		const session = buildVerifiedSession({ userId: 'u2' })
		expect(session.userId).toBe('u2')
		expect(buildSessionClaims().device).toMatch(/^[0-9a-f-]{36}$/i)
		expect(session.token).toBeTruthy()
		expect(session.jti).toBeTruthy()
	})
})
