import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
	baseDirectory: __dirname,
})

const eslintConfig = [
	...compat.extends('next/core-web-vitals', 'next/typescript'),
	{
		ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
	},
	{
		files: ['**/*.cjs', 'tests/scripts/**/*.ts'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
	{
		files: ['src/useCases/**/*.usecase.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: "CallExpression[callee.name='getPrismaClient']",
					message:
						'Use injectables.prisma or src/utils/workUnitPhases helpers (ADR-007). Direct getPrismaClient() is not allowed in use cases.',
				},
			],
		},
	},
	{
		files: ['src/components/theme-script.tsx'],
		rules: {
			// Intentional blocking script from /theme.js (CSP 'self', no inline HTML).
			'@next/next/no-sync-scripts': 'off',
		},
	},
]

export default eslintConfig
