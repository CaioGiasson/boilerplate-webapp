import { NextResponse } from 'next/server'
import { isGoogleOAuthReady } from '@/config/env'
import ApiPresenter from '@/utils/Api.presenter'

/**
 * Public readiness for the "Continue with Google" button.
 * Does not expose secrets — only whether OAuth is configured.
 */
export async function GET() {
	return NextResponse.json(ApiPresenter.success('Google OAuth readiness', { ready: isGoogleOAuthReady() }))
}
