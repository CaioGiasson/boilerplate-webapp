import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { ProfileForm } from '@/components/auth/ProfileForm'
import { buildDocumentMetadata } from '@/lib/build-document-metadata'

type ProfilePageProps = {
	params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
	const { locale } = await params
	return buildDocumentMetadata(locale, 'profile')
}

export default async function ProfilePage({ params }: ProfilePageProps) {
	const { locale } = await params
	setRequestLocale(locale)
	return <ProfileForm />
}
