import { NOTIFICATION_LINK_MAX_LENGTH, isSafeInAppLink } from '@/utils/safeInAppLink'

describe('isSafeInAppLink', () => {
	it.each(['/', '/notifications', '/pt/profile?tab=1', '/a/b#c'])('aceita %s', (link) => {
		expect(isSafeInAppLink(link)).toBe(true)
	})

	it.each([
		'',
		'notifications',
		'//evil.com',
		'https://evil.com',
		'http://evil.com/x',
		'javascript:alert(1)',
		'/\\evil.com',
		'/ok\r\nSet-Cookie: a=b',
		'/a\tb',
		'/path:with-colon',
		`/${'a'.repeat(NOTIFICATION_LINK_MAX_LENGTH)}`,
	])('recusa %j', (link) => {
		expect(isSafeInAppLink(link)).toBe(false)
	})
})
