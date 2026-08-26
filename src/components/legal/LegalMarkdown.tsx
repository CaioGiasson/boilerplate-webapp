import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode {
	const parts = text.split(/(\*\*[^*]+\*\*)/g)
	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			return <strong key={index}>{part.slice(2, -2)}</strong>
		}
		return part
	})
}

export function LegalMarkdown({ source }: { source: string }) {
	const blocks = source.trim().split(/\n{2,}/)

	return (
		<div className="space-y-4 text-sm leading-relaxed text-foreground">
			{blocks.map((block, index) => {
				if (block.startsWith('# ')) {
					return (
						<h1 key={index} className="text-3xl font-semibold tracking-tight sm:text-4xl">
							{renderInline(block.slice(2))}
						</h1>
					)
				}
				if (block.startsWith('## ')) {
					return (
						<h2 key={index} className="pt-2 text-xl font-semibold tracking-tight">
							{renderInline(block.slice(3))}
						</h2>
					)
				}
				if (block.split('\n').every((line) => line.startsWith('- '))) {
					return (
						<ul key={index} className="list-disc space-y-1 pl-5">
							{block.split('\n').map((line, lineIndex) => (
								<li key={lineIndex}>{renderInline(line.slice(2))}</li>
							))}
						</ul>
					)
				}
				return (
					<p key={index} className="whitespace-pre-line">
						{renderInline(block)}
					</p>
				)
			})}
		</div>
	)
}
