# Notificações e Web Push

Decisão: [ADR-015](../adr/015-notifications-and-web-push.md). PWA e service worker: [pwa.md](pwa.md).

## Ligar o Web Push

1. Gere o par de chaves VAPID **uma vez por ambiente**:

    ```bash
    npm run vapid:keys
    ```

2. Coloque as três variáveis no `.env` (ou no secret store) do ambiente e reinicie:

    | Variável            | Valor                                                           |
    | ------------------- | --------------------------------------------------------------- |
    | `VAPID_PUBLIC_KEY`  | chave pública (vai para o navegador; não é segredo)             |
    | `VAPID_PRIVATE_KEY` | chave privada — **segredo**, nunca no git nem em log            |
    | `VAPID_SUBJECT`     | contato do operador: `mailto:ops@seudominio.com` ou `https://…` |

    Só as três juntas ligam o push. Configuração parcial **derruba o boot** com `VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set together`.

3. Em **Configurações → Notificações no dispositivo**, ative o toggle e use **Enviar notificação de teste**.

Sem as variáveis o app funciona só com o sino. O toggle mostra "não configuradas neste ambiente".

### Trocar as chaves (rotação)

Chave nova invalida **todas** as assinaturas existentes (o navegador as amarrou à chave antiga): cada usuário precisa reativar o push em cada aparelho. Faça só em caso de vazamento da chave privada.

## Quais serviços de push são aceitos

O servidor envia o push por POST ao `endpoint` que o navegador informa. Para evitar SSRF, só são aceitos endpoints **HTTPS, sem porta explícita**, em hosts de: `fcm.googleapis.com` (Chrome/Edge/Android), `push.services.mozilla.com` (Firefox), `notify.windows.com` (Edge/Windows) e `push.apple.com` (Safari/iOS). Outro serviço? Acrescente o sufixo em `WEB_PUSH_ALLOWED_HOSTS` (separado por vírgula). IP literal, `localhost` e nomes internos são sempre recusados (400).

## Notificar alguém a partir de código

Receba `CreateNotification` no construtor e chame **depois do commit** do seu use case:

```ts
await this.createNotification.run({
	userId,
	type: 'ORDER_SHIPPED',
	title: 'Pedido enviado',
	text: 'Seu pedido saiu para entrega.',
	link: '/orders/123', // caminho interno; opcional
})
```

- `skipWebPush: true` grava só o sino.
- `link` precisa começar com uma única `/`; URL externa é recusada (400).
- Falha de push não lança: a notificação já gravada permanece.

## Rotas

| Rota                                         | Uso                                                |
| -------------------------------------------- | -------------------------------------------------- |
| `GET /api/v1/notifications`                  | Lista paginada (`cursor`, `limit`) + `unreadCount` |
| `POST /api/v1/notifications/{id}/read`       | Marca uma como lida                                |
| `POST /api/v1/notifications/read-all`        | Marca todas                                        |
| `GET /api/v1/push/vapid-public-key`          | `{ enabled, publicKey }` (público)                 |
| `POST` / `DELETE /api/v1/push/subscriptions` | Assina / cancela o aparelho atual                  |
| `POST /api/v1/push/test`                     | Envia um teste para a própria conta                |

## Privacidade e retenção

- Notificações: 180 dias (`NOTIFICATION_RETENTION_DAYS`), apagadas pelo job `retention-purge` ([retention.md](retention.md)); a exclusão definitiva da conta apaga também as assinaturas.
- A exportação LGPD inclui as notificações e **só a data** de cada aparelho inscrito; endpoint e chaves não saem.
- Nunca logue `endpoint`, `p256dh` ou `auth`.
- Serviços de push do navegador (Google FCM, Mozilla, Apple) recebem o conteúdo da notificação: não coloque dado sensível no `title`/`text`.

## Problemas comuns

| Sintoma                           | Causa provável                                                       |
| --------------------------------- | -------------------------------------------------------------------- |
| Toggle diz "não configuradas"     | `VAPID_*` ausentes no ambiente do servidor                           |
| Toggle diz "bloqueadas"           | Permissão negada no navegador; liberar nas configurações do site     |
| Teste não chega em iPhone         | iOS só entrega push para o app instalado na tela inicial             |
| Funcionava e parou em um aparelho | Assinatura expirou (404/410): o servidor a removeu; reative o toggle |
| 409 ao ativar                     | Limite de 10 aparelhos por usuário; cancele um antigo                |
