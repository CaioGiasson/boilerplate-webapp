# Política de retenção (PRIV-I03)

Documento operacional interno. A política voltada ao titular resume estes prazos em linguagem simples (`content/legal/privacy.*.md`). **Backups offsite** não fazem parte desta tabela — ver seção própria.

## Tabela de retenção (v1)

| Dado / artefato                                          | Prazo                                                                                  | Ação                                                                                              | Estado operacional                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Conta e conteúdo online (User, Image, Files `published`) | Enquanto a conta estiver **ativa**                                                     | Permanecem até exclusão pelo titular ou encerramento legal                                        | **Operacional** — quarentena 30d em PRIV-C04 (`docs/operators/account-deletion.md`)        |
| Conta após pedido de exclusão (quarentena)               | **30 dias** após `User.deletedAt`                                                      | Conteúdo oculto; identidade e Spaces preservados; restore via login + CANCELAR                    | **Operacional** (PRIV-C04)                                                                 |
| Conta após hard delete                                   | Após quarentena (cron)                                                                 | Anonimização PII + soft-delete de imagens + `DeleteObject` no Spaces + revogação de sessões       | **Operacional** — passo 5 do `retention-purge`                                             |
| Sessão JWT (cookie)                                      | Até `exp` do token                                                                     | Cookie some / token rejeitado após expiração ou revogação (`jti` / `sessionsRevokedAt`)           | **Operacional** — TTL atual: `JWT_TTL_SECONDS` default **604800 (7 dias)**                 |
| `SessionEvent`                                           | Até o `exp` do token associado (quando gravado); senão, alinhado à vida útil da sessão | Registro de logout/revogação; não é PII de conta após anonimização                                | **Operacional** — job `retention-purge` remove `exp` no passado (`docs/operators/cron.md`) |
| `ActiveSession`                                          | Até o `exp` do JWT                                                                     | Linha de sessão listável no perfil                                                                | **Operacional** — mesmo job remove `exp` no passado                                        |
| Files com status `orphan`                                | Alvo **7 dias** após marcar orphan (`updatedAt`)                                       | `DeleteObject` no Spaces para objetos remanescentes; registro Mongo pode permanecer como trilha   | **Operacional** — `npm run cron -- retention-purge` (+ alias `spaces:purge-orphans`)       |
| Image soft-deleted (`deletedAt`)                         | Alvo **30 dias** após soft-delete                                                      | `DeleteObject` no Spaces + File → `orphan`; a imagem some do mosaico imediatamente no soft-delete | **Operacional** — passo 1 do `retention-purge` (#177)                                      |
| Logs de aplicação / host                                 | **90 dias** (alvo operacional)                                                         | Retenção no agregador ou rotação no host                                                          | **Processo do operador** — não há worker no app                                            |
| Backups / dumps offsite                                  | Ciclo próprio do backup                                                                | Fora do fluxo de exclusão online                                                                  | **Separado** — não bloqueia direito de eliminação no sistema ativo                         |

## JWT de 7 dias (decisão de produto / residual)

O TTL longo (7 dias) é a **escolha de produto atual**, documentada aqui e no `SECURITY-REPORT` (SEC-I02 residual). Não é aceite desta política reduzir o TTL sem refresh/2FA. Risco residual: janela maior de reuso de cookie roubado até `exp` ou revogação explícita.

## Agendamento

Ver `docs/operators/cron.md` (npm, crontab, exemplo Kubernetes CronJob). Sem o schedule no host/cluster, o código existe mas o prazo continua dependente de execução manual.

## Follow-ups opcionais (fora do aceite mínimo)

1. Rotação / retenção de logs no host ou agregador (90d) — checklist de ops.
2. Inventário de backups com TTL e procedimento pós-exclusão de conta.
3. Reavaliação de `JWT_TTL_SECONDS` após refresh token / sessão curta.

## Referências

- Issues: [PRIV-I03 #70](https://github.com/CaioGiasson/boilerplate-webapp/issues/70), [PRIV-C04 #81](https://github.com/CaioGiasson/boilerplate-webapp/issues/81), [SEC-I01 #52](https://github.com/CaioGiasson/boilerplate-webapp/issues/52), [SEC-I02 #53](https://github.com/CaioGiasson/boilerplate-webapp/issues/53)
- Cron: `docs/operators/cron.md`
- Exclusão de conta: `docs/operators/account-deletion.md`
- RoPA / suboperadores: `docs/operators/subprocessors-ropa.md`
