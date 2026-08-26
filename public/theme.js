;(() => {
	try {
		const match = document.cookie.match(/(?:^|; )vitraux-theme=([^;]*)/)
		const cookieTheme = match ? decodeURIComponent(match[1]) : null
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		const theme = cookieTheme === 'light' || cookieTheme === 'dark' ? cookieTheme : prefersDark ? 'dark' : 'light'
		document.documentElement.classList.toggle('dark', theme === 'dark')
	} catch (_) {}
})()
