import { randomBytes } from 'node:crypto'
import {
	base32Decode,
	base32Encode,
	buildOtpauthUri,
	generateRecoveryCodes,
	generateTotpSecret,
	hashRecoveryCode,
	looksLikeRecoveryCode,
	normalizeRecoveryCode,
	totpCode,
	totpStep,
	verifyTotp,
} from '@/utils/totp'
import { decryptSecret, encryptSecret, parseTwoFactorKey } from '@/utils/twoFactorCrypto'

// RFC 6238, apêndice B (SHA-1): segredo ASCII "12345678901234567890", 6 últimos dígitos do código de 8.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))
const RFC_VECTORS: Array<[number, string]> = [
	[59, '287082'],
	[1111111109, '081804'],
	[1111111111, '050471'],
	[1234567890, '005924'],
	[2000000000, '279037'],
	[20000000000, '353130'],
]

describe('base32', () => {
	it('ida e volta e vetores conhecidos (RFC 4648)', () => {
		expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI')
		expect(base32Decode('MZXW6YTBOI')?.toString()).toBe('foobar')
		const bytes = randomBytes(20)
		expect(base32Decode(base32Encode(bytes))?.equals(bytes)).toBe(true)
	})

	it('aceita minúsculas, espaços e padding; recusa caractere inválido', () => {
		expect(base32Decode('mzxw 6ytb oi==')?.toString()).toBe('foobar')
		expect(base32Decode('MZXW1')).toBeNull()
	})
})

describe('TOTP', () => {
	it.each(RFC_VECTORS)('bate com o vetor da RFC 6238 em t=%i', (seconds, expected) => {
		expect(totpCode(RFC_SECRET, totpStep(seconds * 1000))).toBe(expected)
	})

	it('verifyTotp devolve o passo que casou e aceita ±1 passo', () => {
		const now = 1111111109 * 1000
		const step = totpStep(now)

		expect(verifyTotp(RFC_SECRET, '081804', now)).toBe(step)
		expect(verifyTotp(RFC_SECRET, '081804', now + 30_000)).toBe(step)
		expect(verifyTotp(RFC_SECRET, '081804', now - 30_000)).toBe(step)
		expect(verifyTotp(RFC_SECRET, '081804', now + 90_000)).toBeNull()
	})

	it.each(['', '12345', '1234567', 'abcdef', '08180 ', '000000'])('recusa código inválido %j', (code) => {
		expect(verifyTotp(RFC_SECRET, code, 1111111109 * 1000)).toBeNull()
	})

	it('recusa segredo que não é base32', () => {
		expect(verifyTotp('!!!', '123456')).toBeNull()
		expect(totpCode('', 1)).toBeNull()
	})

	it('segredo novo tem 160 bits, é base32 e muda a cada chamada', () => {
		const first = generateTotpSecret()

		expect(first).toMatch(/^[A-Z2-7]{32}$/)
		expect(base32Decode(first)).toHaveLength(20)
		expect(generateTotpSecret()).not.toBe(first)
	})

	it('monta a URI otpauth com issuer, período e dígitos', () => {
		const uri = buildOtpauthUri({ secret: 'ABC', accountName: 'ada lovelace@x.com', issuer: 'Meu App' })

		expect(uri.startsWith('otpauth://totp/Meu%20App:ada%20lovelace%40x.com?')).toBe(true)
		const query = new URL(uri).searchParams
		expect(query.get('secret')).toBe('ABC')
		expect(query.get('issuer')).toBe('Meu App')
		expect(query.get('digits')).toBe('6')
		expect(query.get('period')).toBe('30')
	})
})

describe('códigos de recuperação', () => {
	it('gera 10 códigos únicos no formato XXXXX-XXXXX', () => {
		const codes = generateRecoveryCodes()

		expect(codes).toHaveLength(10)
		expect(new Set(codes).size).toBe(10)
		for (const code of codes) expect(code).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/)
	})

	it('normaliza (hífen, espaço, caixa) e o hash é o mesmo para qualquer grafia', () => {
		const [code] = generateRecoveryCodes(1)
		const sloppy = ` ${code.toLowerCase().replace('-', ' - ')} `

		expect(normalizeRecoveryCode(sloppy)).toBe(code.replace('-', ''))
		expect(hashRecoveryCode(sloppy)).toBe(hashRecoveryCode(code))
		expect(hashRecoveryCode(code)).toMatch(/^[0-9a-f]{64}$/)
		expect(hashRecoveryCode('AAAAA-AAAAA')).not.toBe(hashRecoveryCode('AAAAA-AAAAB'))
	})

	it('reconhece a aparência de um código e recusa o resto', () => {
		expect(looksLikeRecoveryCode('abcde-fghij')).toBe(true)
		expect(looksLikeRecoveryCode('123456')).toBe(false)
		expect(looksLikeRecoveryCode('ABCDE-FGH1J')).toBe(false)
	})
})

describe('cifra do segredo', () => {
	const key = randomBytes(32)

	it('ida e volta; cada cifra usa IV novo', () => {
		const first = encryptSecret('JBSWY3DPEHPK3PXP', key)

		expect(first.startsWith('v1.')).toBe(true)
		expect(first).not.toContain('JBSWY3DPEHPK3PXP')
		expect(decryptSecret(first, key)).toBe('JBSWY3DPEHPK3PXP')
		expect(encryptSecret('JBSWY3DPEHPK3PXP', key)).not.toBe(first)
	})

	it('com outra chave, adulterado ou em formato errado devolve null (nunca lança)', () => {
		const blob = encryptSecret('SEGREDO', key)
		const [version, iv, tag, data] = blob.split('.')
		const tampered = [version, iv, tag, Buffer.from('x' + data).toString('base64url')].join('.')

		expect(decryptSecret(blob, randomBytes(32))).toBeNull()
		expect(decryptSecret(tampered, key)).toBeNull()
		expect(decryptSecret('lixo', key)).toBeNull()
		expect(decryptSecret(`v2.${iv}.${tag}.${data}`, key)).toBeNull()
		expect(decryptSecret(`${blob}.extra`, key)).toBeNull()
	})

	it('parseTwoFactorKey exige 32 bytes em base64', () => {
		expect(parseTwoFactorKey(key.toString('base64'))?.equals(key)).toBe(true)
		expect(parseTwoFactorKey(undefined)).toBeNull()
		expect(parseTwoFactorKey('  ')).toBeNull()
		expect(parseTwoFactorKey(randomBytes(16).toString('base64'))).toBeNull()
	})
})
