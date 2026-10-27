# Testes E2E (Playwright)

Jornadas de ponta a ponta contra o app **construído** e um MongoDB **só dos testes**. Complementam o Jest (que mocka o banco): aqui sobe o servidor de verdade, com cookies, CSRF, rate limit e Mongo reais.

> **Status:** os 12 casos passam no GitHub Actions (Mongo 7 em replica set + Chromium), executados pela primeira vez na PR #10. Rodar localmente ainda não foi exercitado por quem escreveu os testes.

## Rodar localmente

Pré-requisitos: um MongoDB em replica set (o `docker-compose.yaml` do repositório serve) e o `.env` preenchido.

```bash
npm run build                       # os testes usam o build de produção
npm run e2e:prepare                 # cria as coleções no banco "e2e" (prisma db push)
npx playwright install chromium     # uma vez (~150 MB); só o projeto "ui" usa navegador
npm run e2e                         # sobe o servidor na porta 3100 e roda tudo
npx playwright test --project=api   # só a API, sem navegador
npx playwright show-report          # relatório HTML da última execução
```

- **Banco separado:** `E2E_DATABASE_URL`, ou o `DATABASE_URL` com o nome do banco trocado por `e2e`. `e2e:prepare` recusa o mesmo banco do `DATABASE_URL`. Os testes criam contas `e2e_*` e as apagam no fim; **nunca aponte para um banco com dados que importam.**
- **Porta:** `E2E_PORT` (padrão 3100). Com `reuseExistingServer` fora do CI, um servidor já rodando nessa porta é reaproveitado.

## O que cobre

| Projeto | Arquivo                     | Jornada                                                                                                                             |
| ------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `api`   | `e2e/api/auth.spec.ts`      | cadastro → verificação → perfil → logout → login; senha errada; e-mail repetido e senha fraca; CSRF (Origin alheia); `x-request-id` |
| `api`   | `e2e/api/twoFactor.spec.ts` | ativar 2FA (segredo cifrado no banco), login em duas etapas, replay do código, código de recuperação de uso único, desativar        |
| `ui`    | `e2e/ui/login.spec.ts`      | login pelo formulário → home → perfil com a conta; senha errada; rota protegida sem sessão                                          |

Os textos vêm dos catálogos (`messagesByLocale.pt`), não de strings soltas: mudar um rótulo não quebra o teste.

## Como o ambiente de teste é montado

`playwright.config.ts` sobe `npm run start` com variáveis próprias:

- **Origem:** a base URL é `http://localhost:3100`, não `127.0.0.1`: o `next start` monta a origem com `localhost` e a checagem de CSRF a compara com o `Origin` (com `127.0.0.1` toda mutação dá 403).
- `NODE_ENV=production` (é o `next start`), que recusa `EMAIL_PROVIDER=none`; por isso o e-mail aponta para o Brevo com chave falsa e `BREVO_API_BASE_URL=http://127.0.0.1:9` (porta morta): o envio falha rápido, o app o trata como "melhor esforço" e **nada sai para a internet**.
- **Verificação de e-mail:** o e-mail não chega, então o teste marca a conta como verificada direto no banco (`markEmailVerified`), o equivalente de abrir o link.
- **2FA:** uma `TWO_FACTOR_ENCRYPTION_KEY` aleatória por execução; o TOTP é calculado no teste com o mesmo `src/utils/totp.ts`, a partir do segredo que o próprio endpoint de setup devolve.
- `JOBS_WORKER=off`: o worker de jobs não roda durante os testes.
- **Limite de tentativas:** é por IP (`ip:auth:<identificador>`). Cada conta de teste manda o seu IP em `x-real-ip` (cabeçalho confiável que o Next não altera), então os testes não dividem balde.

## CI

`.github/workflows/e2e.yml` (em `pull_request` e manual): Mongo 7 como replica set (as transações do Prisma exigem), `prisma generate`, `e2e:prepare`, build, Chromium com `--with-deps`, `npm run e2e`. Em falha, envia `playwright-report/` e `test-results/` como artefato (traces incluídos).

O job **não** é `continue-on-error`: falha vermelha na PR. Para bloquear o merge, inclua `E2E / e2e` nos checks exigidos (hoje o único exigido é `CI / verify`, ver `AGENTS.md`).

## Escrever um teste novo

- Conta única por teste (`newUser()`), sempre com o prefixo `e2e_`; limpeza no `afterAll` (`deleteE2eUsers`).
- Prefira o projeto `api` (rápido, sem navegador) para regra de negócio; reserve o `ui` para o que só existe no navegador (formulários, redirecionamentos).
- Não dependa de relógio: o TOTP só vale uma vez por passo de 30 s; para fluxos que repetem o código, use o código de recuperação ou espere o próximo passo.
- Não coloque segredo real no teste nem no `webServer.env`.

## Limites conhecidos

- Não cobre o login com Google nem o envio real de e-mail (sem provedor nos testes).
- Rodam com **um worker** (contas únicas e uma porta); o tempo total cresce linearmente.
- Os testes `ui` fixam o idioma `pt`.
