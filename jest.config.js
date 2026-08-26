/** @type {import('jest').Config} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				isolatedModules: true,
			},
		],
		'^.+\\.js$': [
			'ts-jest',
			{
				isolatedModules: true,
			},
		],
	},
	transformIgnorePatterns: ['node_modules/(?!(jose)/)'],
	clearMocks: true,
	collectCoverageFrom: ['src/useCases/**/*.ts', 'src/utils/**/*.ts', 'src/repositories/**/*.ts', '!src/**/*.d.ts'],
	coverageThreshold: {
		global: {
			branches: 25,
			functions: 35,
			lines: 40,
			statements: 40,
		},
	},
}

module.exports = config
