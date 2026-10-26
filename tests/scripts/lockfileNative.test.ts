import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const { REQUIRED_LINUX_X64_PACKAGES, missingNativePackages } = require('../../scripts/lib/lockfileNative.cjs')

describe('lockfileNative', () => {
	it('não aponta nada quando todos os binários estão no lockfile', () => {
		const packages = Object.fromEntries(REQUIRED_LINUX_X64_PACKAGES.map((name: string) => [name, {}]))

		expect(missingNativePackages({ packages })).toEqual([])
	})

	it('lista os binários ausentes', () => {
		const packages = { 'node_modules/@img/sharp-linux-x64': {} }

		expect(missingNativePackages({ packages })).toEqual(
			REQUIRED_LINUX_X64_PACKAGES.filter((name: string) => name !== 'node_modules/@img/sharp-linux-x64')
		)
		expect(missingNativePackages({})).toEqual(REQUIRED_LINUX_X64_PACKAGES)
	})

	it('o package-lock.json do repositório está completo (evita falha do npm ci no CI Linux)', () => {
		const lockfile = JSON.parse(readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8'))

		expect(missingNativePackages(lockfile)).toEqual([])
	})
})
