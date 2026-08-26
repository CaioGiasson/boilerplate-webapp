import { NextRequest } from 'next/server'
import { getDependencies } from '@/container/dependencies'
import exportUserDataRoute from '@/controllers/User/routes/exportUserData.route'

export async function GET(request: NextRequest) {
	return exportUserDataRoute(request, getDependencies())
}
