export type WebPushPayload = {
	title: string
	text: string
	/** Caminho interno já validado por `isSafeInAppLink`. */
	link?: string
	notificationId?: string
}

/** Envio de Web Push. Sem VAPID configurado `isEnabled()` é `false` e `sendToUser` não faz nada. */
export interface WebPushPort {
	isEnabled(): boolean
	getPublicKey(): string | null
	/** Envia a todos os aparelhos do usuário. Falha por aparelho não lança: é logada e, se expirada, limpa. */
	sendToUser(userId: string, payload: WebPushPayload): Promise<void>
}
