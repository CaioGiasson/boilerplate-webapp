export const NOTIFICATION_LINK_MAX_LENGTH = 500

/**
 * Aceita só caminho interno: começa com uma única `/` e não contém `\`, `:` nem quebra de linha.
 * Bloqueia `//host`, `https://…`, `javascript:` e `/\host` (open redirect). O service worker repete a regra.
 */
export function isSafeInAppLink(link: string): boolean {
	if (!link.startsWith('/') || link.startsWith('//')) return false
	if (link.includes('\\') || link.includes(':')) return false
	if (/[\r\n\t]/.test(link)) return false
	return link.length <= NOTIFICATION_LINK_MAX_LENGTH
}
