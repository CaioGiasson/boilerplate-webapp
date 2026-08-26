# Exclusão de conta (PRIV-C04)

## Política de produto

- A exclusão solicitada pelo titular inicia uma **quarentena de 30 dias** (`User.deletedAt`).
- Nesse período a conta e os conteúdos ficam **ocultos**, mas e-mail/nickname/senha/Google e objetos no Spaces **permanecem**.
- O titular pode **cancelar** a exclusão fazendo login e escolhendo **CANCELAR exclusão do perfil**.
- Após 30 dias, o job `retention-purge` faz o **hard delete**: anonimização PII, soft-delete de imagens, `DeleteObject` no Spaces.
- **Backups offsite** são geridos fora deste fluxo.

## O que o sistema faz no pedido de exclusão

1. Valida confirmação: senha atual (se a conta tem senha) **ou** apenas a palavra de confirmação (conta só-Google autenticada).
2. Seta `deletedAt` e `sessionsRevokedAt`; apaga `ActiveSession` do usuário; revoga o jti atual.
3. **Não** anonimiza, **não** altera senha, **não** soft-deleta imagens em massa, **não** apaga Spaces.
4. Envia e-mail de quarentena (best-effort) com data do pedido, prazo e aviso LGPD de exclusão irrecuperável.
5. Limpa cookies e redireciona o client para `/account-delete`.

## Restauração

1. Login (senha ou Google) com conta em quarentena (&lt; 30d) cria sessão de decisão e abre `/account-delete?decision=1`.
2. **CANCELAR** → `POST /api/v1/users/me/deletion/cancel` limpa `deletedAt` e envia e-mail de confirmação do cancelamento (best-effort).
3. **MANTER** → `POST /api/v1/users/me/deletion/keep` mantém quarentena e encerra a sessão.

## Hard delete (cron)

Ver `docs/operators/cron.md` — passo de contas com `deletedAt` &gt; 30 dias.

## API

| Método   | Path                               | Auth                 | Notas                               |
| -------- | ---------------------------------- | -------------------- | ----------------------------------- |
| `DELETE` | `/api/v1/users/me`                 | sessão ativa         | Body: `currentPassword?`, `locale?` |
| `GET`    | `/api/v1/users/me/deletion`        | sessão em quarentena | Status `deletedAt` / `deadlineAt`   |
| `POST`   | `/api/v1/users/me/deletion/cancel` | sessão em quarentena | Restaura conta + e-mail             |
| `POST`   | `/api/v1/users/me/deletion/keep`   | sessão em quarentena | Mantém exclusão; limpa cookie       |

## Limitações documentadas

- Backups e dumps fora do app não são apagados por este fluxo.
- Falha de e-mail não impede a quarentena.
- Legal hold é processo separado.
