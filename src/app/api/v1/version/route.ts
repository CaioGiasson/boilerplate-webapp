import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/constants/app'
import ApiPresenter from '@/utils/Api.presenter'

/** Público e sem estado: o cliente compara com a versão do próprio bundle para forçar atualização (PWA). */
export async function GET() {
	return NextResponse.json(ApiPresenter.success('Version', { version: APP_VERSION }), {
		headers: { 'Cache-Control': 'no-store' },
	})
}
