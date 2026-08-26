export type GoogleUserInfo = {
	sub: string
	email: string
	emailVerified: boolean
	name: string | null
	picture: string | null
}

export type GoogleOAuthPort = {
	buildAuthorizeUrl(state: string): string
	exchangeCode(code: string): Promise<{ accessToken: string }>
	fetchUserInfo(accessToken: string): Promise<GoogleUserInfo>
}
