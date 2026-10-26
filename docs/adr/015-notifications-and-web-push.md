# ADR-015 — Notificações in-app e Web Push

- **Status:** Aceito
- **Data:** 2026-10-26

## Contexto

O app precisa avisar o usuário de eventos fora da tela atual: um sino dentro do app e, opcionalmente, notificações do navegador mesmo com o app fechado. O `tribalRPGBot` tem as duas coisas; este ADR traz o núcleo genérico, sem os tipos de evento do jogo.

## Decisão

- **Duas camadas independentes.** `Notification` (sino, sempre disponível) e Web Push (opcional, só com `VAPID_*`). Sem VAPID o app funciona só com o sino; a configuração **parcial** recusa o boot (`assertVapidConfig`).
- **Ponto de entrada único para criar notificação: o use case `CreateNotification`.** Outros use cases o chamam **depois do commit**; ele grava fora de transação e só então chama o push (chamada externa nunca dentro de `$transaction`, ADR-007). Falha de push é logada e engolida: a notificação já gravada permanece.
- **Opt-in por aparelho.** Cada navegador assina e cancela por conta própria (`PushSubscription`, até 10 por usuário). Não há preferência global de push: cancelar a assinatura é o opt-out.
- **Link só interno.** `link` é caminho relativo (`isSafeInAppLink`): validado ao criar **e** de novo no service worker ao abrir. Qualquer outra coisa vira `/` (evita open redirect).
- **Assinaturas e privacidade.** `endpoint`, `p256dh` e `auth` identificam o aparelho e permitem enviar a ele: nunca saem em exportação nem em log. O `endpoint` é recusado se não for HTTPS público. A assinatura de um aparelho passa para a última conta que se inscreveu nele. 404/410 do serviço de push removem a assinatura.
- **Impersonamento (ADR-013):** assinar, cancelar e enviar teste respondem 403; ler e marcar como lida continuam funcionando.
- **Teste de entrega:** `POST /api/v1/push/test` envia uma notificação **para a própria conta** (rate limit de autenticação), para validar o aparelho.
- **Retenção:** notificações por 180 dias (`NOTIFICATION_RETENTION_DAYS`); exclusão definitiva da conta apaga notificações e assinaturas.
- **Não portado do tribal:** tipos de evento do jogo, aviso semanal para ativar push, digest de mensagens não lidas e os scripts de operador `send-push`/`send-push-all` (o envio programático é `CreateNotification`).

## Consequências

### Positivas

- Qualquer feature nova notifica com uma chamada; o push é um detalhe de entrega.
- Sem VAPID nada quebra; com VAPID mal configurado o deploy falha cedo.

### Negativas / trade-offs

- O contador do sino é por **polling** (60 s e ao voltar para a aba). Tempo real (SSE/WebSocket) está no backlog.
- Push depende de serviços do navegador (Google, Mozilla, Apple): entram como suboperadores (`subprocessors-ropa.md`, `transfers.md`). iOS só recebe push com o app instalado na tela inicial.
- Sem broadcast para todos os usuários: seria um script de operador à parte.

## Referências

- `src/useCases/createNotification.usecase.ts`, `src/services/WebPush/`, `public/sw.js` (handlers `push` e `notificationclick`)
- `docs/operators/web-push.md`
