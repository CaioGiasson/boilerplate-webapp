import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import AuthController from '@/controllers/Auth/Auth.controller'

export async function POST(request: NextRequest) {
	return AuthController.impersonate(request, getDependencies())
}
