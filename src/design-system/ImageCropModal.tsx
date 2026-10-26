'use client'

import * as React from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Button } from '@/design-system/Button'
import { AppSlider } from '@/design-system/Slider'
import { cn } from '@/lib/utils'

export type ImageCropModalProps = {
	open: boolean
	imageSrc: string | null
	aspect: number
	title: string
	confirmLabel: string
	cancelLabel: string
	zoomLabel: string
	onCancel: () => void
	onConfirm: (croppedAreaPixels: Area) => void
	confirmDisabled?: boolean
	'data-testid'?: string
}

export function ImageCropModal({
	open,
	imageSrc,
	aspect,
	title,
	confirmLabel,
	cancelLabel,
	zoomLabel,
	onCancel,
	onConfirm,
	confirmDisabled,
	'data-testid': testId = 'image-crop-modal',
}: ImageCropModalProps) {
	const [crop, setCrop] = React.useState({ x: 0, y: 0 })
	const [zoom, setZoom] = React.useState(1)
	const [croppedPixels, setCroppedPixels] = React.useState<Area | null>(null)

	React.useEffect(() => {
		if (!open) return
		setCrop({ x: 0, y: 0 })
		setZoom(1)
		setCroppedPixels(null)
	}, [open, imageSrc])

	React.useEffect(() => {
		if (!open) return
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onCancel()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onCancel])

	if (!open || !imageSrc) return null

	return (
		<div className="fixed inset-0 z-[200]" data-testid={testId} role="dialog" aria-modal="true" aria-label={title}>
			<button
				type="button"
				className="absolute inset-0 bg-black/50"
				aria-label={cancelLabel}
				onClick={onCancel}
			/>
			<div
				className={cn(
					'absolute top-1/2 left-1/2 flex w-[min(40rem,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2',
					'flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl'
				)}
			>
				<p className="border-b border-border px-4 py-3 text-sm font-medium">{title}</p>
				<div className="relative h-[min(50vh,20rem)] w-full bg-muted">
					<Cropper
						image={imageSrc}
						crop={crop}
						zoom={zoom}
						aspect={aspect}
						onCropChange={setCrop}
						onZoomChange={setZoom}
						onCropComplete={(_area, croppedAreaPixels) => {
							setCroppedPixels(croppedAreaPixels)
						}}
					/>
				</div>
				<div className="space-y-3 px-4 py-3">
					<div className="space-y-1.5">
						<p className="text-xs text-muted-foreground">{zoomLabel}</p>
						<AppSlider
							min={1}
							max={3}
							step={0.01}
							value={[zoom]}
							onValueChange={(value) => setZoom(value[0] ?? 1)}
							aria-label={zoomLabel}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onCancel}>
							{cancelLabel}
						</Button>
						<Button
							type="button"
							disabled={confirmDisabled || !croppedPixels}
							data-testid={`${testId}-confirm`}
							onClick={() => {
								if (!croppedPixels) return
								onConfirm(croppedPixels)
							}}
						>
							{confirmLabel}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
