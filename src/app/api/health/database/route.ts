import { getPrismaClient } from '@/managers/Db.manager'
import { NextRequest, NextResponse } from 'next/server'
import LogManager from '@/managers/Log.manager'
import { healthNotFoundResponse, isAllowedHealthHttpRequest } from '@/utils/healthAccess'

export async function GET(request: NextRequest) {
	if (!isAllowedHealthHttpRequest(request)) {
		return healthNotFoundResponse()
	}

	const prisma = getPrismaClient()

	try {
		await prisma.$runCommandRaw({ ping: 1 })
		return NextResponse.json({
			success: true,
			dependency: 'database',
			status: 'ok',
		})
	} catch {
		LogManager.error('Database healthcheck failed')
		return NextResponse.json(
			{
				success: false,
				dependency: 'database',
				status: 'down',
			},
			{ status: 503 }
		)
	}
}
