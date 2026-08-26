# Jobs agendados (PRIV-I03)

Os jobs moram em `scripts/cron/`. O dispatcher aceita o nome do job e flags `--dry-run` / `--confirm`.

## npm

```bash
npm run cron -- list
npm run cron -- retention-purge --dry-run
npm run cron -- retention-purge --confirm
# alias
npm run cron:retention -- --dry-run
# alias legado
npm run spaces:purge-orphans -- --dry-run
```

## Job `retention-purge`

Alinha `docs/operators/retention.md`:

| Passo | Ação                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------- |
| 1     | Imagens com `deletedAt` > 30 dias: `DeleteObject` no Spaces + `File` → `orphan`                    |
| 2     | `DeleteObject` no Spaces para `File` com `status=orphan` e `updatedAt` > 7 dias                    |
| 3     | Apaga `SessionEvent` com `exp` no passado                                                          |
| 4     | Apaga `ActiveSession` com `exp` no passado                                                         |
| 5     | Contas com `User.deletedAt` > 30 dias: hard purge (Spaces + soft-delete imagens + anonimizar stub) |

Linhas Mongo de `File` orphan **não** são apagadas (trilha). Mutações exigem `--confirm`.

## Crontab (host / VM)

```cron
0 3 * * * cd /caminho/para/boilerplate-webapp && /usr/bin/npm run cron -- retention-purge --confirm >> /var/log/app-retention-purge.log 2>&1
```

Requer `.env` com `DATABASE_URL` e credenciais Spaces no ambiente do processo.

## Kubernetes

Exemplo versionado: `deploy/cron/cronjob-retention-purge.yaml` (ajustar image e `secretRef`).

## Logs / 90 dias

Retenção de logs de aplicação continua **processo do operador** (rotação no host/agregador), fora deste worker.

## Referências

- [PRIV-I03 #70](https://github.com/CaioGiasson/boilerplate-webapp/issues/70)
- `docs/operators/retention.md`
