import { normalizeNickname, canonicalizeNickname } from '@/utils/nickname'
import { ValidationError } from '@/errors'

describe('nickname', () => {
	describe('canonicalizeNickname', () => {
		it('aplica NFC + lowercase', () => {
			expect(canonicalizeNickname('Admin')).toBe('admin')
			expect(canonicalizeNickname('CAFÉ')).toBe('café')
			expect(canonicalizeNickname('cafe\u0301')).toBe('café')
		})

		it('remove zero-width e BOM', () => {
			expect(canonicalizeNickname('ad\u200Bmin')).toBe('admin')
			expect(canonicalizeNickname('\uFEFFalice')).toBe('alice')
		})
	})

	describe('normalizeNickname', () => {
		it('Admin e admin colidem no canônico', () => {
			expect(normalizeNickname('Admin')).toBe('admin')
			expect(normalizeNickname('ADMIN')).toBe('admin')
			expect(normalizeNickname('admin')).toBe('admin')
		})

		it('compõe NFC (é vs e + combining acute)', () => {
			expect(normalizeNickname('café')).toBe('café')
			expect(normalizeNickname('cafe\u0301')).toBe('café')
		})

		it('rejeita homógrafo cirílico (а vs a)', () => {
			// U+0430 CYRILLIC SMALL LETTER A
			expect(() => normalizeNickname('аdmin')).toThrow(ValidationError)
			expect(() => normalizeNickname('Аdmin')).toThrow(ValidationError)
		})

		it('rejeita controles e bidi', () => {
			expect(() => normalizeNickname('ad\u0000min')).toThrow(ValidationError)
			expect(() => normalizeNickname('admin\u202E')).toThrow(ValidationError)
		})

		it('rejeita forma que muda sob NFKC (fullwidth)', () => {
			// U+FF41 FULLWIDTH LATIN SMALL LETTER A
			expect(() => normalizeNickname('\uFF41dmin')).toThrow(ValidationError)
		})

		it('aceita ASCII válido com _ e -', () => {
			expect(normalizeNickname('alice_01')).toBe('alice_01')
			expect(normalizeNickname('Bob-2')).toBe('bob-2')
		})

		it('rejeita vazio / só invisíveis', () => {
			expect(() => normalizeNickname('   ')).toThrow(ValidationError)
			expect(() => normalizeNickname('\u200B\u200B')).toThrow(ValidationError)
		})
	})
})
