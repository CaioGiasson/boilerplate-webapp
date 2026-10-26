import { jsonValueToBoolean } from '@/utils/jsonValueToBoolean'

describe('jsonValueToBoolean', () => {
	it.each([
		[null, false],
		[undefined, false],
		[true, true],
		[false, false],
		[1, true],
		[0, false],
		['true', true],
		[' TRUE ', true],
		['1', true],
		['false', false],
		['yes', false],
		[[], false],
	])('converte %p em %p', (input, expected) => {
		expect(jsonValueToBoolean(input)).toBe(expected)
	})

	it('lê active, enabled e value de objetos, nessa ordem', () => {
		expect(jsonValueToBoolean({ active: true })).toBe(true)
		expect(jsonValueToBoolean({ enabled: 'true' })).toBe(true)
		expect(jsonValueToBoolean({ value: 0 })).toBe(false)
		expect(jsonValueToBoolean({ active: false, enabled: true })).toBe(false)
		expect(jsonValueToBoolean({ other: true })).toBe(false)
	})
})
