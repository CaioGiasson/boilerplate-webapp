;(function () {
	var ERROR_PATH = '/error.html'
	var SNIPPET = 'Application error: a client-side exception'
	var FRAME_ID = 'app-error-fallback-frame'
	var covering = false

	function currentPath() {
		try {
			return location.pathname
		} catch {
			return ''
		}
	}

	function alreadyOnErrorPage() {
		var path = currentPath()
		return path === ERROR_PATH || path.indexOf(ERROR_PATH) === path.length - ERROR_PATH.length
	}

	function isOffline() {
		try {
			return navigator.onLine === false
		} catch {
			return false
		}
	}

	function isFatal(name, message) {
		name = name || ''
		message = message || ''
		// Falha de chunk offline é falta de rede, não erro de runtime: não cobre a tela.
		if (!isOffline()) {
			if (name === 'ChunkLoadError') return true
			if (/ChunkLoadError/i.test(name) || /ChunkLoadError/i.test(message)) return true
			if (/Loading chunk [\w-]+ failed/i.test(name) || /Loading chunk [\w-]+ failed/i.test(message)) return true
			if (/Failed to fetch dynamically imported module/i.test(message)) return true
			if (/error loading dynamically imported module/i.test(message)) return true
			if (/Unable to preload CSS/i.test(message)) return true
		}
		return message.indexOf(SNIPPET) !== -1
	}

	function showErrorPage() {
		if (covering || alreadyOnErrorPage()) return
		covering = true
		if (document.getElementById(FRAME_ID)) return
		var frame = document.createElement('iframe')
		frame.id = FRAME_ID
		frame.src = ERROR_PATH
		frame.setAttribute('title', document.title || 'Error')
		frame.style.cssText =
			'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:#151519'
		document.documentElement.appendChild(frame)
	}

	function onError(event) {
		var name = event.error && event.error.name ? event.error.name : ''
		if (!isFatal(name, event.message || '')) return
		event.preventDefault()
		showErrorPage()
	}

	function onRejection(event) {
		var reason = event.reason
		var name = ''
		var message = ''
		if (reason && typeof reason === 'object') {
			name = reason.name || ''
			message = reason.message || String(reason)
		} else if (reason) {
			message = String(reason)
		}
		if (!isFatal(name, message)) return
		event.preventDefault()
		showErrorPage()
	}

	function scanForNextDefault() {
		if (alreadyOnErrorPage() || covering) return
		var root = document.body
		if (!root) return
		var text = root.innerText || root.textContent || ''
		if (text.indexOf(SNIPPET) !== -1) showErrorPage()
	}

	window.addEventListener('error', onError, true)
	window.addEventListener('unhandledrejection', onRejection)

	var observer = new MutationObserver(scanForNextDefault)
	function startObserver() {
		if (!document.documentElement) return
		observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
		scanForNextDefault()
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', startObserver)
	} else {
		startObserver()
	}
})()
