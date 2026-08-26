import { NextRequest, NextResponse } from 'next/server'
import { isGoogleOAuthReady } from '@/config/env'
import { healthNotFoundResponse, isAllowedHealthHttpRequest } from '@/utils/healthAccess'

export async function GET(request: NextRequest) {
	if (!isAllowedHealthHttpRequest(request)) {
		return healthNotFoundResponse()
	}

	return NextResponse.json({
		success: true,
		status: 'ok',
		dependencies: {
			database: {
				url: '/api/health/database',
			},
			googleOAuth: {
				ready: isGoogleOAuthReady(),
			},
		},
	})
}
