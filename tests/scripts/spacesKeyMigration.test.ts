const {
	LEGACY_KEY_PATTERN,
	parseLegacyKey,
	buildNewKey,
	buildCanonicalUrl,
} = require('../../scripts/lib/spacesKeyMigration.cjs')

describe('spacesKeyMigration', () => {
	it('reconhece keys legadas', () => {
		expect(LEGACY_KEY_PATTERN.test('dev/images/ab12cd34.jpg')).toBe(true)
		expect(LEGACY_KEY_PATTERN.test('prod/avatars/deadbeef.png')).toBe(true)
		expect(LEGACY_KEY_PATTERN.test('507f1f77bcf86cd799439011/images/aabbccddeeff00112233445566778899.jpg')).toBe(
			false
		)
	})

	it('parseia category e extensão', () => {
		expect(parseLegacyKey('dev/images/ab12cd34.JPG')).toEqual({
			env: 'dev',
			category: 'images',
			extension: 'jpg',
		})
		expect(parseLegacyKey('owner/images/x.jpg')).toBeNull()
	})

	it('monta key nova e URL canônica', () => {
		const key = buildNewKey('507f1f77bcf86cd799439011', 'avatars', 'png', () => 'a'.repeat(32))
		expect(key).toBe(`507f1f77bcf86cd799439011/avatars/${'a'.repeat(32)}.png`)
		expect(buildCanonicalUrl('https://vitraux.nyc3.digitaloceanspaces.com', key)).toBe(
			`https://vitraux.nyc3.digitaloceanspaces.com/${key}`
		)
	})
})
