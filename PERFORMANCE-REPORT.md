# Relatório de performance e qualidade — Vitraux

> **Label no board:** `performance` (issues #124–#131).
>
> **Referência normativa:** os códigos deste relatório citam `PERFORMANCE-ASSESSMENT.md`. O assessment é a checklist absoluta; este arquivo confronta cada item com o codebase/arquitetura atuais, classifica severidade e gera backlog de melhorias.

| Campo          | Valor                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tipo           | Revisão whitebox de **performance, estabilidade, escalabilidade, confiabilidade, usabilidade e qualidade de engenharia**          |
| Alvo           | Vitraux (Next.js 15.5.23, App Router, Prisma/MongoDB, DigitalOcean Spaces)                                                        |
| Data           | 2026-08-25                                                                                                                        |
| Escopo         | Arquitetura de camadas, DI, dados, cache, frontend, API, observabilidade, confiabilidade, escala, testes, CI/CD, UX e acoplamento |
| Fora de escopo | Benchmarks de produção com tráfego real, tuning de VM/Kubernetes, CDN comercial já provisionado, profiling contínuo em staging    |
| Status inicial | Gaps abrem como **Aberto** para tratamento                                                                                        |

**Legenda de Status:** `Aberto` · `Em andamento` · `Mitigado` · `Aceito (risco)` · `Não aplica`

**Complexidade (1–5):** 1 = config/trecho local · 3 = vários arquivos + teste · 5 = arquitetura ou plataforma.

**Confiança (1–5):** 1 = hipotético · 3 = plausível com lacuna de runtime · 5 = evidência direta no código desta revisão.

---

## Resumo executivo

O Vitraux já tem **base de engenharia sólida** para um produto em fase inicial: camadas rota → controller → use case → repository, composition root, singleton de Prisma, paginação cursor no mosaico, validação Zod, rate limit em auth, timeouts em I/O externo, logging com redação, health checks, Jest em use cases críticos, husky/lint + **CI em PR**, fases de storage fora da TX (ADR-007) e JWT sem sticky session.

Os **8 críticos** do board (#124–#131) estão todos endereçados. Após #180/#181: CACHE-01, API-06, DI-04, FE-03 (Aceito) e OBS-05 (Aceito) fechados. Gaps seguintes: FE-06 (RSC), CACHE-03 (invalidação ampla), OBS-03/04, REL-05, SCALE-03, QA-04/05, COUP-05.

| Área                    | Críticos abertos | Importantes abertos\* | Minors | Não aplica |
| ----------------------- | ---------------: | --------------------: | -----: | ---------: |
| Performance / qualidade |                0 |                    ~8 | ~1\*\* |          4 |

\*Abertos ≈ COUP-05, FE-06, CACHE-03, OBS-03/04, REL-05, SCALE-03, QA-04/05.  
\*\*OBS-05 Aceito; demais minors da leva anterior Mitigados.

**Contagem vs assessment:** 65 itens no `PERFORMANCE-ASSESSMENT.md` · críticos do épico performance fechados após #124–#131 / PRs até #179.

---

## Controles positivos observados (assessment ✅)

| Código   | Controle                                                  | Onde                                                                  |
| -------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| ARCH-01  | Camadas rota → controller → use case → repository/service | `src/controllers`, `src/useCases`, `src/repositories`, `src/services` |
| ARCH-02  | Controllers finos                                         | `*.controller.ts`                                                     |
| ARCH-03  | Use cases com master port                                 | `UseCase.masterport.ts`                                               |
| ARCH-04  | Persistência atrás de repositories                        | `*.repository.ts`                                                     |
| DI-01    | Composition root                                          | `src/container/dependencies.ts`                                       |
| DI-03    | Prisma singleton                                          | `getPrismaClient()` / `Db.manager.ts`                                 |
| ARCH-05  | Fronteiras TX/root + fases storage                        | ADR-007/008, master port                                              |
| DATA-01  | Índices em consultas quentes de Image/sessão              | `prisma/models/image.prisma`, `activeSession.prisma`                  |
| DATA-03  | Paginação cursor (~40)                                    | `listUserImages.usecase.ts`, `Image.repository.ts`                    |
| FE-01    | App Router híbrido                                        | `src/app/[locale]/**`                                                 |
| FE-04    | Lazy-load no mosaico                                      | `MosaicImage.tsx`                                                     |
| FE-07    | Skeletons / aria-busy                                     | `MosaicImageSkeleton.tsx`, `ImageMosaicFeed.tsx`                      |
| API-01   | Validação de entrada                                      | Zod / schemas nas rotas                                               |
| API-02   | Rate limit auth                                           | `rateLimit.middleware.ts`                                             |
| API-04   | Timeouts e-mail / import                                  | `Brevo.service.ts`, `RemoteImage.service.ts`                          |
| API-08   | Limites de body/metadados                                 | `dataUrl.ts`, `imageMetadataLimits.ts`                                |
| OBS-01   | Logging com redação                                       | `Log.manager.ts`                                                      |
| OBS-02   | Health app + DB                                           | `api/health/**`, `healthcheck.mjs`                                    |
| REL-01   | Erros tipados + `handleRoute`                             | `src/errors`, `routeHandler.ts`                                       |
| REL-04   | Cron de retenção fora do request                          | `scripts/cron/**`                                                     |
| SCALE-01 | JWT sem sticky session                                    | `session.ts`                                                          |
| QA-01    | Jest em use cases críticos                                | `tests/useCases/**`                                                   |
| CI-01    | ESLint + Prettier + husky                                 | `package.json`, `.husky`                                              |
| UX-01    | i18n pt/en/es                                             | `next-intl`, `constants/texts`                                        |
| UX-02    | a11y básica                                               | Radix, aria, focus                                                    |
| UX-05    | Progresso em upload/feed                                  | forms / mosaico                                                       |
| COUP-01  | UI sem Prisma/Spaces                                      | `src/lib/*-client.ts`                                                 |
| COUP-04  | Scripts de operador isolados                              | `scripts/**`                                                          |

---

## 1. Críticos

Gaps que comprometem estabilidade sob carga real, correção sob concorrência, ou a capacidade de evoluir sem regressão silenciosa.

| ID       | Issue                                                     | Status                     | Complexidade | Confiança | Achado                                                                                                                            | Onde                                                                              | Impacto                                                                                           | Mitigação                                                                                                         |
| -------- | --------------------------------------------------------- | -------------------------- | -----------: | --------: | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| DATA-04  | [#124](https://github.com/CaioGiasson/vitraux/issues/124) | Mitigado                   |            3 |         5 | Opt-out do mosaico global carrega settings de **todos** os usuários ativos (`listIdsHiddenFromGlobalMosaic`) e filtra em memória. | `User.repository.ts`; caminho de listagem `scope=all`                             | Latência e memória O(n contas) no hot path; degrada antes do volume de imagens.                   | Flag/índice denormalizado (`appearInGlobalMosaic` por imagem ou set invertido); query que exclui sem full scan.   |
| DATA-05  | [#125](https://github.com/CaioGiasson/vitraux/issues/125) | Mitigado                   |            3 |         5 | Master port envolve **toda** execução em `$transaction`, inclusive GETs de listagem.                                              | `UseCase.masterport.ts`                                                           | Contenção, latência extra e custo no Mongo sem benefício de consistência na maioria das leituras. | Transação só em mutações multi-write; leituras usam cliente sem TX (ou TX read-only explícita quando necessário). |
| DATA-07  | [#126](https://github.com/CaioGiasson/vitraux/issues/126) | Mitigado                   |            4 |         5 | Cada item da página dispara presign (fan-out `Promise.all`) na listagem.                                                          | `StorageUrl.service.ts`; use cases de list/get                                    | Amplifica latência p95/p99 com o page size; satura CPU/assinatura e Spaces sob pico.              | Cache de URL até TTL; batch; ou assinar sob demanda no cliente com endpoint curto por id já authz.                |
| SCALE-02 | [#127](https://github.com/CaioGiasson/vitraux/issues/127) | Não aplica                 |            3 |         5 | Rate limit de auth é **in-memory por processo**; TODO Redis no próprio middleware.                                                | `rateLimit.middleware.ts`; ver `docs/architecture.md`                             | Aceitável em **máquina única**; com N réplicas o limite efetivo multiplica.                       | Se evoluir para multi-pod: rate limit no **API gateway** da entrada do domínio (ou Redis).                        |
| CI-02    | [#128](https://github.com/CaioGiasson/vitraux/issues/128) | Mitigado                   |            2 |         5 | Não há workflows em `.github/workflows`.                                                                                          | `.github/workflows/ci.yml` (PR only)                                              | PRs entram sem gate automático; regressões de perf/arquitetura passam.                            | GitHub Actions: lint + typecheck + test (+ build) em PR.                                                          |
| CI-04    | [#129](https://github.com/CaioGiasson/vitraux/issues/129) | Mitigado (política humana) |            2 |         5 | Build e `npm test` não são obrigatórios no merge.                                                                                 | Repo privado Free — branch protection indisponível                                | Quebra de compilação/testes descoberta só localmente ou em produção.                              | **Política humana:** merge só via PR com `CI / verify` verde; sem Pro/público não há enforce GitHub.              |
| COUP-03  | [#130](https://github.com/CaioGiasson/vitraux/issues/130) | Mitigado                   |            3 |         5 | Mesmo fluxo misturava TX e root client sem fases explícitas.                                                                      | ADR-007, `workUnitPhases.ts`, use cases de storage                                | Perde atomicidade; leituras/escritas fora da TX; bugs intermitentes sob concorrência.             | Fases A/B/C explícitas; helpers `runStorageUploadThenTransaction`, etc.                                           |
| ARCH-05  | [#131](https://github.com/CaioGiasson/vitraux/issues/131) | Mitigado                   |            4 |         5 | Fronteiras TX/root e DI ambígua; classe `DbCommander` sem ganho de perf.                                                          | ADR-008, `Db.manager` funções, singletons Email/Storage, ESLint `getPrismaClient` | Isolamento e previsibilidade; menos estruturas.                                                   | Vazamentos críticos fechados; DI ampla de repos = N/A (ADR-008).                                                  |

---

## 2. Importantes

Gaps reais de escala, observabilidade, resiliência ou qualidade que devem entrar no backlog próximo, sem o mesmo risco imediato dos críticos.

| ID       | Status     | Complexidade | Confiança | Achado                                                                                  | Onde                                         | Impacto                                                    | Mitigação                                                                                |
| -------- | ---------- | -----------: | --------: | --------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| DI-02    | Não aplica |            4 |         5 | Assessment pedia injeção de repos; produto escolheu `new Repo(prisma)` na TX (ADR-008). | use cases                                    | Sem ganho de latência; DI ampla só adiciona variedade.     | Manter padrão atual; DI-04 (ports) se troca de provedor exigir.                          |
| DI-04    | Mitigado   |            3 |         5 | Sem ports estáveis para storage/e-mail no composition root.                             | `Email/*`, `Storage/*`                       | Troca de provedor e mocks de carga ficam manuais.          | Interfaces `EmailPort` / `StoragePort` + adapters.                                       |
| COUP-02  | Não aplica |            3 |         5 | Use case instancia infra concreta.                                                      | use cases                                    | Alinhado a ADR-008 / DI-02 N/A.                            | Singletons de clients pesados; repos `new` na TX.                                        |
| COUP-05  | Aberto     |            4 |         4 | Poucos contratos explícitos entre camadas.                                              | imports cruzados Prisma/SDK                  | Evolução de schema/SDK espalha churn.                      | Ports + DTOs nas bordas.                                                                 |
| DATA-02  | Mitigado   |            2 |         5 | `File` sem índice `ownerId`/`status`; busca textual sem estratégia.                     | `file.prisma`; `Image.repository` `contains` | Jobs de orphan e busca degradam com volume.                | Índices compostos; text index ou search externo se necessário.                           |
| DATA-06  | Mitigado   |            2 |         4 | Pool/connection limits Prisma↔Mongo não documentados/calibrados.                       | `DATABASE_URL`, `Db.manager.ts`              | Multi-instância esgota conexões.                           | Documentar `connection_limit`; smoke com N workers.                                      |
| CACHE-01 | Mitigado   |            4 |         5 | Sem cache de leitura (Redis/`unstable_cache`/CDN app).                                  | (ausente)                                    | Toda listagem bate no Mongo; escala só vertical.           | Cache da primeira página do mosaico / settings; TTL curto + invalidação.                 |
| CACHE-03 | Aberto     |            3 |         5 | Invalidação incompleta após CACHE-01 (só create PUBLIC).                                | `mosaicPublicFirstPageCache.ts`              | Visibility/delete/opt-out podem deixar home stale até TTL. | Ampliar `revalidateTag` (visibility, delete, hide-from-mosaic).                          |
| FE-02    | Mitigado   |            2 |         5 | Sem `loading.tsx` útil; Suspense com `fallback={null}` pontual.                         | `app/[locale]/**`                            | UX e métricas de loading ruins; waterfall percebido.       | `loading.tsx` + fallbacks com skeleton.                                                  |
| FE-03    | Aceito     |            3 |         5 | `<img>` nativo no mosaico (eslint bypass de `next/image`).                              | `MosaicImage.tsx`                            | Sem resize/srcset do Next; bytes e LCP piores em mobile.   | `next/image` com remotePatterns das URLs assinadas **ou** doc de política + CDN próprio. |
| FE-06    | Aberto     |            4 |         5 | Feed busca no cliente após hidratar.                                                    | `ImageMosaicFeed.tsx`, `images-client.ts`    | RTT extra; piora LCP/TTFB percebido.                       | Primeira página via RSC/streaming.                                                       |
| API-03   | Mitigado   |            3 |         5 | Sem rate limit amplo em list/upload/import.                                             | rotas Image                                  | Abuso de leitura/escrita degrada origem.                   | Quotas por IP/user além de auth.                                                         |
| API-05   | Mitigado   |            3 |         4 | Sem retry/backoff em Brevo/Spaces.                                                      | serviços externos                            | Blips de rede viram erro de usuário.                       | Retry idempotente com jitter em 429/5xx transitórios.                                    |
| API-06   | Mitigado   |            3 |         4 | Sem idempotency keys em mutações.                                                       | upload/report/reset                          | Retry de cliente duplica efeitos.                          | Header `Idempotency-Key` + store curto.                                                  |
| OBS-03   | Aberto     |            3 |         5 | Sem métricas (latência, erro, saturação).                                               | (ausente)                                    | Sem SLO mensurável; perf “no escuro”.                      | Prometheus/OTEL metrics ou APM SaaS.                                                     |
| OBS-04   | Aberto     |            3 |         5 | Sem tracing; `instrumentation.ts` só valida env.                                        | `instrumentation.ts`                         | Debug de lentidão app→Mongo→Spaces manual.                 | OpenTelemetry traces.                                                                    |
| REL-02   | Mitigado   |            4 |         4 | Sem circuit breaker/bulkhead.                                                           | e-mail/Spaces/import                         | Dependência lenta contamina workers.                       | Breaker por dependência + timeouts já existentes.                                        |
| REL-03   | Mitigado   |            2 |         5 | Sem graceful shutdown SIGTERM.                                                          | processo Node                                | Deploys cortam requests no meio.                           | Drain + `prisma.$disconnect`.                                                            |
| REL-05   | Aberto     |            5 |         4 | Trabalho pesado ainda síncrono no request.                                              | upload/import/e-mail/presign                 | Picos alongam latência HTTP.                               | Fila (BullMQ/SQS) para assíncrono.                                                       |
| SCALE-03 | Aberto     |            4 |         3 | Sem CDN/edge para hot assets **públicos**.                                              | Spaces presign direto                        | Origem Spaces sob leitura pública repetida.                | CDN só para PUBLIC/estáticos; ver também § Não aplica.                                   |
| SCALE-04 | Mitigado   |            3 |         5 | Sem smoke multi-instância.                                                              | (ausente)                                    | Escala horizontal não verificada.                          | Subir 2 processos e validar sessão + rate limit + upload.                                |
| QA-03    | Mitigado   |            3 |         5 | Sem teste de carga (k6/Artillery).                                                      | (ausente)                                    | Regressão de perf não detectada.                           | Script k6 em listagem/auth.                                                              |
| QA-04    | Aberto     |            4 |         5 | Sem harness de integração Mongo real.                                                   | Jest com mocks                               | Bugs de índice/query só em runtime.                        | Testcontainers ou Mongo de CI.                                                           |
| QA-05    | Aberto     |            4 |         5 | Sem E2E do produto (Puppeteer é CLI Pinterest).                                         | `scripts/export-from-pinterest`              | Regressão de fluxo crítico.                                | Playwright: login → mosaico → upload.                                                    |
| CI-03    | Mitigado   |            1 |         5 | Sem `tsc --noEmit` no `package.json`.                                                   | `package.json`                               | Erros de tipo escapam se build não rodar.                  | Script `typecheck` no CI.                                                                |
| UX-03    | Mitigado   |            2 |         5 | Sem `error.tsx` de rota.                                                                | `app/[locale]`                               | Exceção de render → tela genérica.                         | Error boundaries App Router.                                                             |
| UX-04    | Mitigado   |            3 |         4 | Feedback de erro/rede desigual entre fluxos.                                            | clients/forms                                | Usuário não distingue timeout/401/500.                     | Helper único de erro de API + toasts.                                                    |

---

## 3. Minors

Melhorias de higiene, polimento e preparação; não bloqueiam escala imediata sozinhas.

| ID        | Status   | Complexidade | Confiança | Achado                                                                    | Onde                  | Impacto                                                         | Mitigação                                                                     |
| --------- | -------- | -----------: | --------: | ------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| CACHE-02  | Mitigado |            2 |         4 | Sem `Cache-Control` em respostas públicas cacheáveis.                     | rotas/pages           | Browser/CDN não ajudam origem.                                  | Headers em conteúdo realmente público e estável.                              |
| FE-05     | Mitigado |            2 |         5 | Sem bundle analyzer / budgets.                                            | (ausente)             | Regressão de JS passa quieta.                                   | `@next/bundle-analyzer` + budget no CI.                                       |
| API-07    | Mitigado |            1 |         3 | Compressão/payloads não auditados formalmente.                            | Next default compress | Risco baixo se plataforma já comprime; falta disciplina de DTO. | Revisar campos extras; doc de compressão no host.                             |
| OBS-05    | Aceito   |            3 |         4 | Sem alertas/SLO/paging.                                                   | (ausente)             | Degradação só por reclamação.                                   | Aceito até OBS-03; alertas depois de métricas.                                |
| QA-02     | Mitigado |            1 |         5 | Sem thresholds de cobertura.                                              | `jest.config.js`      | Cobertura pode cair sem alarme.                                 | `coverageThreshold` mínimo nos use cases críticos.                            |
| FE-03-doc | Mitigado |            1 |         5 | Se `next/image` for rejeitado por URLs assinadas, falta política escrita. | `MosaicImage.tsx`     | Time reabre o debate a cada PR.                                 | Nota em `PERFORMANCE-ASSESSMENT` / ADR curta. _(agrupado a FE-03 no backlog)_ |

---

## 4. Não aplica (ao modelo atual do projeto)

Itens do assessment que **não geram backlog útil agora**, porque o desenho do produto os torna inaplicáveis ou estritamente derivados.

| ID                        | Status     | Motivo                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SCALE-03 (PRIVATE/SECRET) | Não aplica | Objetos PRIVATE/SECRET usam **presigned GET de curta duração** após `canViewImage`. CDN/edge cache clássico quebraria authz ou exigiria arquitetura de cookie/token na borda fora do escopo atual. Mantém-se SCALE-03 **Importante** apenas para assets PUBLIC/estáticos (ver tabela §2). |
| SCALE-02                  | Não aplica | Deploy atual = **máquina única** sem LB/multi-pod (`docs/architecture.md`). Rate limit in-memory basta. Se virar multi-pod, promover a Crítico/Importante e aplicar rate limit no **API gateway** (ou Redis).                                                                             |
| COUP-02                   | Não aplica | Instanciação concreta de repos/services no use case é o padrão pós ADR-008 (com singletons de I/O pesado).                                                                                                                                                                                |
| DI-02                     | Não aplica | Injetar repositories no construtor não melhora latência e conflita com o client da TX. Padrão: `new Repo(injectables.prisma)` (ADR-008).                                                                                                                                                  |

---

## 5. Mapa assessment → este relatório

| Assessment                                                                   | Neste relatório                              |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| ✅ (incl. ARCH-05, DI-03)                                                    | Controles positivos / críticos mitigados     |
| DATA-04, DATA-05, DATA-07, CI-02*, CI-04, COUP-03, ARCH-05 (*CI-02 mitigado) | **Críticos** (todos mitigados; SCALE-02 N/A) |
| COUP-05, FE-06, CACHE-03, OBS-03/04, REL-05, SCALE-03, QA-04/05              | **Importantes** abertos                      |
| CACHE-02/FE-05/API-07/FE-03-doc/QA-02 Mitigado; OBS-05 Aceito                | **Minors**                                   |
| CDN PRIVATE/SECRET; SCALE-02 (single-machine); DI-02 / COUP-02               | **Não aplica**                               |

---

## 6. Ordem sugerida de backlog

1. **CACHE-03** — invalidar home também em visibility/delete/opt-out (CACHE-01 já Mitigado, TTL 120s).
2. **FE-06** — primeira página RSC (`initialImages`).
3. **OBS-03/04** — métricas/tracing antes de otimizar no escuro.
4. Demais: COUP-05, REL-05, SCALE-03, QA-04/05 conforme produto.
5. **SCALE-02** só se o deploy deixar de ser máquina única → rate limit no API gateway.

**Mitigados recentes (#180/#181):** CACHE-01, API-06, DI-04, FE-03 Aceito, OBS-05 Aceito; críticos #124–#131; CI-03. DI-02/COUP-02 N/A (ADR-008).

---

## 7. Pré-refinamento (caminho técnico curto)

### DATA-04

Denormalizar opt-out: campo em `Image` ou coleção invertida `hiddenFromGlobalMosaicUserIds` atualizada no `setUserSetting`. Listagem `scope=all` filtra com `$nin`/`not in` indexável. Remover `listIdsHiddenFromGlobalMosaic` full scan. Teste com N usuários fictícios.

### DATA-05

No master port: `execute` de leitura chama `prisma` sem `$transaction`; mutações mantêm TX. Ou flag `transactional: boolean` no use case. Medir latência de `listUserImages` antes/depois.

### DATA-07

Após authz da página, reutilizar URL assinada em cache memória/Redis chave=`fileId` até `exp - skew`. Alternativa: endpoint `GET /images/:id/content-url` lazy no client. Evitar N `getSignedUrl` síncronos no request da lista.

### SCALE-02

**Status: Não aplica** enquanto o deploy for máquina única (`docs/architecture.md`).
Se virar multi-pod: preferir rate limit no **API gateway** da entrada do domínio; Redis no app é alternativa.

### CI-02 / CI-03 / CI-04

Workflow `pull_request`: `npm ci` → `prisma:generate` → lint → typecheck → test → build (CI-02/03 mitigados; #178).
CI-04: repo privado Free sem branch protection — merge só com `CI / verify` verde (**política humana**).

### COUP-03 / ARCH-05

**COUP-03 e ARCH-05 mitigados:** ADR-007 + `workUnitPhases`; ADR-008 — Prisma/Email/Spaces como singletons funcionais; sem `DbCommander`; repos com `new` na TX de propósito. DI-02 ampla = N/A.

### CACHE-01 / CACHE-03

**CACHE-01 Mitigado (#181):** `unstable_cache` na 1ª página `scope=all` PUBLIC, revalidate **120s**, tag `mosaic-public-first-page`; invalidate no create PUBLIC.  
**CACHE-03 Aberto:** ampliar invalidação (visibility, delete, hide-from-global-mosaic). Redis só se multi-instância.

### DI-02

**Não aplica** (ADR-008). Não injetar repositories no container por performance.

---

## 8. Como usar este arquivo

1. Abrir issues a partir das tabelas **Críticos** e **Importantes** (uma issue por épico ou por ID).
2. Ao mitigar, atualizar **Status** aqui e marcar ✅ no `PERFORMANCE-ASSESSMENT.md`.
3. Não misturar com `SECURITY-REPORT.md` / assessments de segurança-privacidade — são eixos distintos.
4. Itens **Não aplica** só voltam ao backlog se o modelo de produto mudar (ex.: CDN autenticado na borda).
