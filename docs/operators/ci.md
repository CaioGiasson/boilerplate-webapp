# CI e binários nativos

Workflow: `.github/workflows/ci.yml` (roda só em `pull_request`; check `CI / verify`).

## Por que existe a checagem do lockfile

O boilerplate usa pacotes com binários nativos (`sharp`, `@next/swc`, Tailwind `oxide`, `lightningcss`). O runner do CI é Linux x64; o `package-lock.json` costuma ser gerado em Windows ou macOS. Se o lockfile **não listar** os binários opcionais de Linux, o `npm ci` não os instala e o `next build` falha com um erro obscuro de módulo nativo.

O workflow roda `npm run check:lockfile-native` **antes** do `npm ci`: ele falha cedo, com a lista do que falta. O teste `tests/scripts/lockfileNative.test.ts` faz a mesma checagem no `npm test`.

## E2E

O workflow separado `E2E` (`.github/workflows/e2e.yml`) roda os testes Playwright com um Mongo em replica set. Não é o check exigido (`CI / verify`), mas falha vermelha na PR: ver [`e2e.md`](e2e.md).

## Estado atual

O lockfile do boilerplate **já lista** os binários necessários (verificado). Por isso o workaround do `tribalRPGBot` — `scripts/ci-install-linux-native.sh` instalando os pacotes à mão, `.npmrc` com `supportedArchitectures` e `optionalDependencies` fixas — **não foi portado**. Portar só se a checagem acima passar e o `npm ci` ainda assim não instalar o binário.

## Se o CI falhar por binário ausente

1. Rode `npm run check:lockfile-native` localmente. Se falhar, regenere o lockfile com `npm install` (a partir de um `package-lock.json` limpo, se preciso) e confira de novo; consulte a documentação do npm sobre dependências opcionais por plataforma.
2. Se o lockfile estiver completo e o `npm ci` ainda não instalar o binário, adote o workaround do tribal: `scripts/ci-install-linux-native.sh` (instala os pacotes com `npm pack`), `.npmrc` com `supportedArchitectures` e `optionalDependencies` em Linux, e o step `npm ci --include=optional` no workflow. **Recalcule as versões a partir do seu lockfile**: o script do tribal fixa `sharp 0.33.5`, enquanto aqui é `0.34.x`.

## Variáveis do workflow

O step `Build` define variáveis de ambiente falsas (sem segredos). Variável nova obrigatória no build entra aqui; as opcionais (`AI_PROVIDER`, `VAPID_*`) ficam desligadas por padrão.
