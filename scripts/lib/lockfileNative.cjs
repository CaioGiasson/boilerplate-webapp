/**
 * Pacotes nativos que o build precisa em Linux x64 (glibc). O `package-lock.json` pode ser gerado no Windows/macOS;
 * se esses pacotes opcionais não estiverem listados nele, o `npm ci` do CI não os instala e o build quebra.
 * Veja `docs/operators/ci.md`.
 */
const REQUIRED_LINUX_X64_PACKAGES = [
	'node_modules/@img/sharp-linux-x64',
	'node_modules/@img/sharp-libvips-linux-x64',
	'node_modules/@next/swc-linux-x64-gnu',
	'node_modules/@tailwindcss/oxide-linux-x64-gnu',
	'node_modules/lightningcss-linux-x64-gnu',
]

/**
 * @param {{ packages?: Record<string, unknown> }} lockfile
 * @returns {string[]} entradas obrigatórias ausentes do lockfile
 */
function missingNativePackages(lockfile) {
	const packages = lockfile.packages ?? {}
	return REQUIRED_LINUX_X64_PACKAGES.filter((name) => !(name in packages))
}

module.exports = { REQUIRED_LINUX_X64_PACKAGES, missingNativePackages }
