# Secrets locais (não commitar)

| Arquivo         | Gerado por              | Uso                                      |
| --------------- | ----------------------- | ---------------------------------------- |
| `mongo-keyfile` | `npm run mongo:keyfile` | Replica set + `--auth` no Docker Compose |

O keyfile é montado read-only em `/etc/mongo-keyfile` no container `mongo`.
