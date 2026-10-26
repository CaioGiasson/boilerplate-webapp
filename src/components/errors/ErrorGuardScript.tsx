/**
 * Intercepta erros fatais de carregamento no cliente antes de o Next.js pintar a tela padrão.
 * Arquivo estático para manter válido o `script-src 'self'`.
 */
export function ErrorGuardScript() {
	return <script src="/error-guard.js" />
}
