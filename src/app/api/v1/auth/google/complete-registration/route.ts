import { NextRequest } from 'next/server'
import AuthController from '@/controllers/Auth/Auth.controller'
import { getDependencies } from '@/container/dependencies'

export async function POST(request: NextRequest) {
	const dependencies = getDependencies()
	return AuthController.completeGoogleRegistration(request, dependencies)
}
