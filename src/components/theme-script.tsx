/**
 * Applies stored theme before hydration (static file — CSP 'self').
 */
export function ThemeScript() {
	return <script src="/theme.js" />
}
