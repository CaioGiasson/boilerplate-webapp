import { Suspense } from 'react'
import { AccountDeletePage } from '@/components/auth/AccountDeletePage'

export default function AccountDeleteRoutePage() {
	return (
		<Suspense fallback={null}>
			<AccountDeletePage />
		</Suspense>
	)
}
