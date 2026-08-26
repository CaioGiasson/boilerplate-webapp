# Canonicalização de nickname (SEC-I11 / PRIV-I06)

## Forma canônica

- Unicode **NFC** (não NFKC — formas de compatibilidade são **rejeitadas** no cadastro/update).
- Lowercase com `toLocaleLowerCase('en-US')`.
- Strip de zero-width / BOM / soft hyphen.
- Charset: letras **Latin**, dígitos, `_` e `-` (rejeita cirílico e outros scripts — mitiga homógrafos sem lib UTS #39).

O índice unique do Prisma continua em `User.nickname`; o valor persistido é o canônico.

## Lookup

`UserRepository.findByNickname` e os use cases de register / update / login (por nick) / check aplicam a mesma canonicalização. Login por e-mail **não** passa por esse helper.

## Backfill de dados existentes

Novas escritas já gravam canônico. Contas antigas com caixa mista (`Admin`) precisam de backfill para o login por nick case-insensitive funcionar.

```bash
npm run nickname:backfill -- --dry-run
npm run nickname:backfill -- --confirm
```

### Colisões

Se `Admin` e `admin` existirem:

1. O registro **mais antigo** (`createdAt`) permanece com o nickname canônico.
2. Os demais são renomeados para `rn_{id}` (cabe em 32 chars / charset válido) — o titular deve escolher outro nick no perfil.
3. Contas **não** são apagadas.

Rodar dry-run antes e anexar o relatório de colisões ao PR / runbook se houver.
