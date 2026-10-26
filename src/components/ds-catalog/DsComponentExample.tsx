'use client'

import * as React from 'react'
import { Home, Star, Upload } from 'lucide-react'
import {
	AccordionGroup,
	AccordionSection,
	AppDropdownMenu,
	AppMultiSelect,
	AppSelect,
	AppSlider,
	Avatar,
	Button,
	CodeInput,
	ColorPalettePicker,
	ComplexButton,
	ConfirmActionButton,
	FileDropzone,
	FileInput,
	GoogleIcon,
	HelperBar,
	Icon,
	IconButton,
	ImageCropModal,
	InputPassword,
	InputTextArea,
	InputTitle,
	MultiIcon,
	NavIconButton,
	NavIconLink,
	PasswordChecklist,
	SearchBar,
	SettingsSection,
	StorageProgressBar,
	TagsInput,
	TextArea,
	TextInput,
	Title,
	Toggle,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	useToast,
} from '@/design-system'

type DsComponentExampleProps = {
	componentId: string
}

export function DsComponentExample({ componentId }: DsComponentExampleProps) {
	switch (componentId) {
		case 'Button':
			return (
				<div className="flex flex-wrap gap-2">
					<Button>Default</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="destructive">Destructive</Button>
				</div>
			)
		case 'ConfirmActionButton':
			return <ConfirmActionButton idleLabel="Delete" confirmLabel="Confirm" onConfirm={() => undefined} />
		case 'ComplexButton':
			return (
				<ComplexButton
					icon={Upload}
					title="Upload file"
					subtitle="From your device"
					onClick={() => undefined}
				/>
			)
		case 'Toggle':
			return <ToggleDemo />
		case 'AppSlider':
			return <AppSlider defaultValue={[50]} max={100} step={1} aria-label="Example slider" />
		case 'AppSelect':
			return (
				<AppSelect
					defaultValue="a"
					options={[
						{ value: 'a', label: 'Option A' },
						{ value: 'b', label: 'Option B' },
					]}
					aria-label="Example select"
				/>
			)
		case 'TextInput':
			return <TextInput label="Name" placeholder="Jane Doe" />
		case 'TextArea':
			return <TextArea label="Notes" placeholder="Optional details" />
		case 'InputPassword':
			return <InputPassword label="Password" autoComplete="new-password" />
		case 'InputTitle':
			return <InputTitle defaultValue="Sample title" aria-label="Title" />
		case 'InputTextArea':
			return <InputTextArea defaultValue="Sample description" aria-label="Description" />
		case 'TagsInput':
			return <TagsInputDemo />
		case 'FileInput':
			return <FileInput label="Choose file" helperText="JPEG or PNG up to 3 MB" accept="image/*" />
		case 'FileDropzone':
			return <FileDropzoneDemo />
		case 'SearchBar':
			return <SearchBarDemo />
		case 'CodeInput':
			return <CodeInputDemo />
		case 'PasswordChecklist':
			return (
				<PasswordChecklist
					password="Abcdef1!"
					labels={{
						minLength: 'At least 8 characters',
						complexity: 'At least 3 criteria',
						lowercase: 'Lowercase',
						uppercase: 'Uppercase',
						number: 'Number',
						symbol: 'Symbol',
					}}
				/>
			)
		case 'Icon':
			return <Icon icon={Home} className="size-6" />
		case 'IconButton':
			return (
				<IconButton label="Home" onClick={() => undefined}>
					<Icon icon={Home} />
				</IconButton>
			)
		case 'NavIconButton':
			return (
				<NavIconButton label="Home">
					<Icon icon={Home} />
				</NavIconButton>
			)
		case 'NavIconLink':
			return (
				<NavIconLink label="Home" tooltip="Home" href="/">
					<Icon icon={Home} />
				</NavIconLink>
			)
		case 'HelperBar':
			return (
				<HelperBar dismissLabel="Dismiss" onDismiss={() => undefined}>
					<span>Replying to Ada</span>
				</HelperBar>
			)
		case 'MultiIcon':
			return <MultiIcon icons={[{ icon: Star }, { icon: Home }]} className="size-8" />
		case 'ColorPalettePicker':
			return <ColorPalettePickerDemo />
		case 'AppMultiSelect':
			return <MultiSelectDemo />
		case 'ImageCropModal':
			return <ImageCropModalDemo />
		case 'StorageProgressBar':
			return (
				<div className="flex w-full max-w-xs flex-col gap-3">
					<StorageProgressBar percentUsed={30} />
					<StorageProgressBar percentUsed={75} />
					<StorageProgressBar percentUsed={95} />
				</div>
			)
		case 'GoogleIcon':
			return <GoogleIcon className="size-6" />
		case 'Avatar':
			return (
				<Avatar
					src={null}
					alt="Demo user"
					className="size-10"
					fallback={<span className="text-xs font-medium">DU</span>}
				/>
			)
		case 'Title':
			return <Title as="h2">Section title</Title>
		case 'SettingsSection':
			return (
				<SettingsSection title="Preferences" description="Example grouped settings.">
					<p className="text-sm text-muted-foreground">Child content goes here.</p>
				</SettingsSection>
			)
		case 'AccordionSection':
			return (
				<AccordionGroup defaultValue="demo">
					<AccordionSection value="demo" title="Details">
						<p className="text-sm text-muted-foreground">Collapsible panel content.</p>
					</AccordionSection>
				</AccordionGroup>
			)
		case 'Tooltip':
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline">Hover me</Button>
						</TooltipTrigger>
						<TooltipContent>Helpful hint</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)
		case 'Toast':
			return <ToastDemo />
		case 'AppDropdownMenu':
			return (
				<AppDropdownMenu
					trigger={<Button variant="outline">Open menu</Button>}
					items={[
						{ id: 'one', label: 'Profile', onSelect: () => undefined },
						{ id: 'two', label: 'Sign out', destructive: true, onSelect: () => undefined },
					]}
				/>
			)
		default:
			return null
	}
}

function ToggleDemo() {
	const [checked, setChecked] = React.useState(false)
	return <Toggle checked={checked} onCheckedChange={setChecked} aria-label="Example toggle" />
}

function TagsInputDemo() {
	const [tags, setTags] = React.useState(['alpha', 'beta'])
	return <TagsInput value={tags} onChange={setTags} label="Tags" />
}

function FileDropzoneDemo() {
	const [files, setFiles] = React.useState<File[]>([])
	return <FileDropzone files={files} onFilesChange={setFiles} emptyLabel="Drop files here" accept="image/*" />
}

function SearchBarDemo() {
	const [query, setQuery] = React.useState('')
	return <SearchBar value={query} onValueChange={setQuery} placeholder="Search…" label="Search" />
}

function CodeInputDemo() {
	const [code, setCode] = React.useState('')
	return <CodeInput value={code} onChange={setCode} label="Verification code" />
}

function ToastDemo() {
	const { toast } = useToast()
	return (
		<Button
			variant="outline"
			onClick={() => toast({ title: 'Saved', description: 'Changes applied.', variant: 'success' })}
		>
			Show toast
		</Button>
	)
}

const DEMO_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] as const

function ColorPalettePickerDemo() {
	const [value, setValue] = React.useState<string>(DEMO_COLORS[0])
	return <ColorPalettePicker colors={DEMO_COLORS} value={value} onChange={setValue} label="Color" />
}

function MultiSelectDemo() {
	const [values, setValues] = React.useState<string[]>(['a'])
	return (
		<AppMultiSelect
			label="Options"
			placeholder="Choose"
			options={[
				{ value: 'a', label: 'Option A' },
				{ value: 'b', label: 'Option B' },
				{ value: 'c', label: 'Option C' },
			]}
			values={values}
			onValuesChange={setValues}
		/>
	)
}

const DEMO_IMAGE_SRC =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#3b82f6"/><circle cx="300" cy="200" r="120" fill="#f59e0b"/></svg>'
	)

function ImageCropModalDemo() {
	const [open, setOpen] = React.useState(false)
	return (
		<>
			<Button type="button" variant="outline" onClick={() => setOpen(true)}>
				Open crop modal
			</Button>
			<ImageCropModal
				open={open}
				imageSrc={DEMO_IMAGE_SRC}
				aspect={1}
				title="Adjust photo"
				confirmLabel="Use photo"
				cancelLabel="Cancel"
				zoomLabel="Zoom"
				onCancel={() => setOpen(false)}
				onConfirm={() => setOpen(false)}
			/>
		</>
	)
}
