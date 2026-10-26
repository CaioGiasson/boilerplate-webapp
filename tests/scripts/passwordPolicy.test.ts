import { getPasswordPolicyIssue } from '@/utils/passwordPolicy'

const { passwordPolicyIssue } = require('../../scripts/lib/passwordPolicy.cjs')

const SAMPLES = [
	'',
	'short1A',
	'abcdefgh',
	'ABCDEFGH',
	'abcd1234',
	'Abcd1234',
	'abcd!@#$',
	'Abcd!@#$',
	'ABCD1234!',
	'a'.repeat(128),
	`Aa1${'x'.repeat(125)}`,
	`Aa1${'x'.repeat(126)}`,
	'Sup3r$ecret-password',
]

describe('scripts/lib/passwordPolicy.cjs', () => {
	it.each(
		SAMPLES.map((sample) => [sample.length > 20 ? `${sample.slice(0, 8)}…(${sample.length})` : sample, sample])
	)('concorda com src/utils/passwordPolicy.ts para %p', (_label, sample) => {
		expect(passwordPolicyIssue(sample)).toBe(getPasswordPolicyIssue(sample))
	})
})
