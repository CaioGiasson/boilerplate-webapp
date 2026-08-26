'use client'

import { Trash2, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button, ComplexButton, Icon, IconButton, SettingsSection, TextInput } from '@/design-system'
import type { ProfileFormModel } from '@/components/auth/useProfileForm'

type ProfileBasicsSectionProps = Pick<
	ProfileFormModel,
	| 'name'
	| 'setName'
	| 'nickname'
	| 'setNickname'
	| 'nicknameStatus'
	| 'saving'
	| 'exporting'
	| 'photoInputRef'
	| 'visiblePhotoUrl'
	| 'onPhotoChange'
	| 'openPhotoPicker'
	| 'markPhotoRemoved'
	| 'saveProfile'
	| 'downloadMyData'
>

export function ProfileBasicsSection({
	name,
	setName,
	nickname,
	setNickname,
	nicknameStatus,
	saving,
	exporting,
	photoInputRef,
	visiblePhotoUrl,
	onPhotoChange,
	openPhotoPicker,
	markPhotoRemoved,
	saveProfile,
	downloadMyData,
}: ProfileBasicsSectionProps) {
	const t = useTranslations('profile')
	const tAuth = useTranslations('auth')
	const tValidation = useTranslations('validation')

	return (
		<form className="space-y-4" onSubmit={saveProfile}>
			<SettingsSection title={t('title')}>
				<div className="space-y-4">
					<div className="relative w-full">
						<ComplexButton
							icon={User}
							imageSrc={visiblePhotoUrl}
							title={t('photo')}
							subtitle={t('changePhoto')}
							aria-label={visiblePhotoUrl ? t('changePhoto') : t('addPhoto')}
							className="max-w-none"
							onClick={openPhotoPicker}
							data-testid="profile-photo-button"
						/>
						{visiblePhotoUrl ? (
							<IconButton
								label={t('removePhoto')}
								className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background text-destructive shadow-sm hover:bg-background hover:text-destructive"
								onClick={(event) => {
									event.stopPropagation()
									markPhotoRemoved()
								}}
								data-testid="profile-photo-remove"
							>
								<Icon icon={Trash2} className="h-4 w-4" />
							</IconButton>
						) : null}
						<input
							ref={photoInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							className="sr-only"
							tabIndex={-1}
							aria-hidden
							data-testid="profile-photo-input"
							onChange={(event) => {
								onPhotoChange(event.target.files?.[0] ?? null)
								event.target.value = ''
							}}
						/>
					</div>
					<TextInput label={t('name')} value={name} onChange={(event) => setName(event.target.value)} />
					<TextInput
						label={t('nickname')}
						required
						value={nickname}
						onChange={(event) => setNickname(event.target.value)}
						error={nicknameStatus === 'taken' ? tAuth('nicknameTaken') : undefined}
						success={nicknameStatus === 'available' ? tAuth('nicknameAvailable') : undefined}
						validityMessages={{
							valueMissing: tValidation('nicknameRequired'),
						}}
					/>
					<p className="text-xs text-muted-foreground">{t('nicknameUniquenessHint')}</p>
					<div className="flex flex-wrap gap-3">
						<Button type="submit" disabled={saving || nicknameStatus === 'taken'}>
							{t('saveProfile')}
						</Button>
						<Button type="button" disabled={exporting} onClick={() => void downloadMyData()}>
							{t('downloadMyData')}
						</Button>
					</div>
				</div>
			</SettingsSection>
		</form>
	)
}
