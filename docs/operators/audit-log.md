# Audit log (`AuditEvent`)

Trilha **append-only** das ações sensíveis: quem fez o quê, em qual conta, quando e de onde. Serve para investigar incidente, responder titular e provar que uma ação aconteceu. Não é log de aplicação (`LogManager`) nem substitui o monitoramento.

## O que é registrado

| Ação (`AUDIT_ACTIONS`)              | Onde nasce                                           | `actorType` |
| ----------------------------------- | ---------------------------------------------------- | ----------- |
| `admin.impersonation_token_created` | `createImpersonationToken` (`metadata.ttlSeconds`)   | `admin`     |
| `auth.impersonation_started`        | `consumeImpersonationToken`                          | `admin`     |
| `user.password_changed`             | `changeUserPassword`                                 | `user`      |
| `user.password_reset`               | `resetPassword`                                      | `user`      |
| `user.email_changed`                | `confirmEmailChallenge` (troca concluída)            | `user`      |
| `user.sessions_revoked_others`      | `revokeOtherUserSessions` (`metadata.revokedCount`)  | `user`      |
| `user.account_deletion_requested`   | `deleteUserAccount`                                  | `user`      |
| `user.account_deletion_cancelled`   | `cancelAccountDeletion`                              | `user`      |
| `user.account_deletion_kept`        | `keepAccountDeletion`                                | `user`      |
| `operator.role_changed`             | `npm run change-user-role` (`metadata.from/to`)      | `operator`  |
| `operator.password_changed`         | `npm run change-user-password`                       | `operator`  |
| `operator.feature_flag_toggled`     | `npm run toggle-feature-flag` (`metadata.key/value`) | `operator`  |

Cada evento guarda `actorId?`, `targetUserId?`, `metadata?`, `ip?`, `requestId?` e `createdAt`. O `ip` e o `requestId` vêm do contexto da requisição (`handleRoute`; ver [observabilidade](observability.md)): com o `requestId` você acha as linhas de log da mesma requisição. Scripts e jobs não têm requisição, então gravam sem os dois.

**Nunca** entra: senha, token, e-mail, corpo de requisição. `metadata` é só contexto curto e não sensível.

## Deploy

Model novo: rode `npm run prisma:push` (cria a coleção e os índices; ver [`prisma-indexes.md`](prisma-indexes.md)) antes de subir a versão. Sem a coleção, `record` só loga erro (a ação do usuário segue), mas a trilha fica vazia.

## Garantias e limites

- **Append-only:** o repository não tem `update` nem `delete` por evento. A única remoção é a retenção em lote; a única alteração é zerar o IP (abaixo). Quem tem acesso direto ao banco pode alterar: a trilha **não** é à prova de adulteração por quem administra o Mongo.
- **Falha de auditoria não derruba a ação.** `record` nunca lança: erro vira `LogManager.error('Failed to record audit event')`. Em transação, erro de banco aborta a transação inteira (a ação também não acontece). Monitore essa linha de log.
- Os eventos de use case são gravados **na mesma transação** da ação: se a ação desfaz, o evento também.
- Ações **negadas** (senha errada, 403) não são auditadas aqui: já geram log e rate limit.

## Ver os eventos

- **Tela:** `/admin` → aba **Auditoria** (somente ADMIN, sem impersonamento). Filtro por ação, ordem por data e paginação por cursor. A tela mostra quando, ação, apelido de quem agiu e da conta afetada. **Não** mostra IP, `requestId` nem `metadata`.
- **API:** `GET /api/v1/admin/audit-events` ([`requests/admin/admin.http`](../../requests/admin/admin.http)).
- **Investigação a fundo:** consulta direta na coleção `AuditEvent` (índices por `createdAt`, `action`, `actorId` e `targetUserId`).

## LGPD

| Tema       | Regra                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Base legal | Segurança e prevenção a fraude (legítimo interesse); descreva na política de privacidade do sistema derivado.     |
| Retenção   | **365 dias** (`AUDIT_LOG_RETENTION_DAYS`), aplicada pelo `retention-purge` (passo 7).                             |
| Exportação | `GET /api/v1/users/me/export` traz `auditEvents` (ação, se agiu/foi alvo, IP, data), **sem** o id da outra parte. |
| Exclusão   | Na exclusão definitiva da conta o **evento fica** (segurança), mas o `ip` dos eventos do titular é zerado.        |

## Acrescentar uma ação

1. Incluir em `AUDIT_ACTIONS` (`src/constants/audit.ts`).
2. Chamar `new AuditEventRepository(injectables.prisma).record({ action, actorType, actorId, targetUserId, metadata? })` **depois** da mudança, no mesmo use case.
3. Rótulo nos três catálogos em `admin.auditActions.<acao_com_ponto_trocado_por_underscore>` e em `docs/openapi.yaml` (enum de `action`).
4. Esta tabela. Os testes `tests/scripts/auditActions.test.ts` e `tests/i18n/adminKeys.test.ts` acusam ação sem uso, sem rótulo ou fora do catálogo.

Em script de operador use `recordOperatorAudit` (`scripts/lib/audit.mjs`).
