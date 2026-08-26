# Avaliação absoluta de performance e qualidade — Vitraux

| Campo       | Valor                                                                                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipo        | Referência **absoluta** de performance, estabilidade, escalabilidade, confiabilidade, usabilidade e qualidade de engenharia                                                                                                                                         |
| Data        | 2026-08-21                                                                                                                                                                                                                                                          |
| Propósito   | Checklist de mercado: se **integralmente** cumprido, a aplicação está em nível muito bom e só problemas complexos tendem a restar. Gaps básicos (query ruim, acoplamento, falta de DI, quebra de camadas, ausência de índices/paginação, etc.) devem aparecer aqui. |
| Alvo        | Vitraux (Next.js 15 App Router, Prisma/MongoDB, DigitalOcean Spaces)                                                                                                                                                                                                |
| Cruzamentos | Segurança: `SECURITY-ASSESSMENT.md` · Privacidade: `PRIVACY-ASSESSMENT.md` · Relatório de gaps: `PERFORMANCE-REPORT.md` · Histórico segurança: `SECURITY-REPORT.md`                                                                                                 |

**Legenda:** ✅ cumprido · ❌ não cumprido

Este documento **não** é um relatório de findings pontuais; é o inventário permanente do que se espera de um produto web maduro. O status ✅/❌ reflete o **estado atual** do Vitraux.

---

## Checklist

| Código   | Assessment | Descrição breve                                                                            |
| -------- | ---------- | ------------------------------------------------------------------------------------------ |
| ARCH-01  | ✅         | Separação em camadas (rota → controller → use case → repository/service)                   |
| ARCH-02  | ✅         | Controllers finos (sem regra de negócio)                                                   |
| ARCH-03  | ✅         | Use cases como unidade de aplicação (master port / `run`)                                  |
| ARCH-04  | ✅         | Persistência atrás de repositories (sem SQL/Prisma solto na UI)                            |
| ARCH-05  | ✅         | Fronteiras TX/root e storage fases (ADR-007/008); sem classe DbCommander                   |
| DI-01    | ✅         | Composition root central (`dependencies.ts`)                                               |
| DI-02    | N/A        | Injeção ampla de repositories — **não** adotada (ADR-008: `new Repo(prisma)` na TX)        |
| DI-03    | ✅         | Cliente de DB singleton (`getPrismaClient`)                                                |
| DI-04    | ❌         | Interfaces/portas estáveis para I/O externo (storage, e-mail) testáveis sem `new` concreto |
| DATA-01  | ✅         | Índices nas consultas quentes (Image owner/visibility/createdAt; sessões)                  |
| DATA-02  | ❌         | Índices completos para filtros/jobs (File ownerId/status orphan; busca textual)            |
| DATA-03  | ✅         | Paginação cursor (listagens de imagens, page size limitado)                                |
| DATA-04  | ❌         | Ausência de scans O(n usuários) no caminho quente (mosaic opt-out)                         |
| DATA-05  | ❌         | Leituras sem `$transaction` desnecessária em toda operação                                 |
| DATA-06  | ❌         | Pool / limites de conexão Mongo documentados e calibrados                                  |
| DATA-07  | ❌         | Evitar fan-out síncrono N presigns bloqueando a listagem                                   |
| CACHE-01 | ❌         | Cache de leitura para dados quentes (Redis/`unstable_cache`/CDN)                           |
| CACHE-02 | ❌         | Cache HTTP / `Cache-Control` em respostas públicas cacheáveis                              |
| CACHE-03 | ❌         | Invalidação explícita de cache em mutações                                                 |
| FE-01    | ✅         | App Router com páginas server + componentes cliente onde necessário                        |
| FE-02    | ✅         | `loading.tsx` / Suspense com fallbacks úteis nas rotas principais                          |
| FE-03    | ❌         | Uso de `next/image` (ou política documentada equivalente)                                  |
| FE-04    | ✅         | Lazy-load de imagens no mosaico (`loading="lazy"`)                                         |
| FE-05    | ❌         | Orçamento de bundle (analyzer + budgets no CI)                                             |
| FE-06    | ❌         | Dados iniciais do feed via RSC/streaming (menos waterfall client)                          |
| FE-07    | ✅         | Skeletons / estados de carregamento no mosaico                                             |
| API-01   | ✅         | Validação de entrada (Zod/schemas) antes da lógica                                         |
| API-02   | ✅         | Rate limit em endpoints sensíveis de auth                                                  |
| API-03   | ❌         | Rate limit / quotas em APIs de leitura e upload além de auth                               |
| API-04   | ✅         | Timeouts em I/O externo (e-mail, import remoto)                                            |
| API-05   | ❌         | Retries com backoff em falhas transitórias de I/O                                          |
| API-06   | ❌         | Idempotency keys em mutações críticas                                                      |
| API-07   | ❌         | Compressão HTTP / payloads enxutos documentados                                            |
| API-08   | ✅         | Limites de body / metadados (DoS de payload)                                               |
| OBS-01   | ✅         | Logging estruturado com níveis e redação                                                   |
| OBS-02   | ✅         | Health checks (app + database) protegidos                                                  |
| OBS-03   | ❌         | Métricas de negócio/infra (latência, taxa de erro, saturação)                              |
| OBS-04   | ❌         | Tracing distribuído (OpenTelemetry / APM)                                                  |
| OBS-05   | ❌         | Alertas em SLO (error budget / paging)                                                     |
| REL-01   | ✅         | Erros tipados + handler de rota consistente                                                |
| REL-02   | ❌         | Circuit breaker / bulkhead para dependências externas                                      |
| REL-03   | ❌         | Graceful shutdown (SIGTERM → drain + `$disconnect`)                                        |
| REL-04   | ✅         | Jobs de retenção/cron desacoplados do request path                                         |
| REL-05   | ❌         | Filas para trabalho assíncrono pesado (presign em lote, e-mail)                            |
| SCALE-01 | ✅         | Sessão JWT sem sticky session obrigatória                                                  |
| SCALE-02 | ❌         | Rate limit compartilhado entre instâncias (Redis/store)                                    |
| SCALE-03 | ❌         | Storage/CDN alinhados a escala de leitura (cache edge de assets)                           |
| SCALE-04 | ❌         | Capacidade horizontal testada (smoke multi-instância)                                      |
| QA-01    | ✅         | Suite unitária Jest cobrindo use cases críticos                                            |
| QA-02    | ❌         | Thresholds de cobertura no CI                                                              |
| QA-03    | ❌         | Testes de carga (k6/Artillery) em listagem/auth                                            |
| QA-04    | ❌         | Testes de integração com Mongo real (harness)                                              |
| QA-05    | ❌         | E2E de fluxos críticos (login → mosaico → upload)                                          |
| CI-01    | ✅         | Lint + Prettier + husky/lint-staged locais                                                 |
| CI-02    | ❌         | Pipeline CI (GitHub Actions) em PR                                                         |
| CI-03    | ❌         | `tsc --noEmit` / typecheck obrigatório                                                     |
| CI-04    | ❌         | Build + test automatizados no gate de merge                                                |
| UX-01    | ✅         | i18n pt/en/es na UI principal                                                              |
| UX-02    | ✅         | Padrões básicos de a11y (aria, focus, dialogs)                                             |
| UX-03    | ✅         | `error.tsx` / error boundaries de rota                                                     |
| UX-04    | ✅         | Feedback de erro/rede consistente em fluxos principais (helper + toasts)                   |
| UX-05    | ✅         | Feedback de progresso em ações longas (upload/feed load-more)                              |
| COUP-01  | ✅         | UI não acessa Prisma/Spaces diretamente                                                    |
| COUP-02  | ❌         | Use case não instancia infraestrutura concreta (`new Repository/Service`)                  |
| COUP-03  | ❌         | Um único caminho de cliente DB por unidade de trabalho (sem root fora da TX)               |
| COUP-04  | ✅         | Domínio de imagem isolado de scripts de operador                                           |
| COUP-05  | ❌         | Contratos explícitos entre camadas (ports) sem import cruzado de detalhes                  |

### Resumo

| Status          | Quantidade |
| --------------- | ---------: |
| ✅ Cumprido     |         24 |
| ❌ Não cumprido |         41 |
| **Total**       |     **65** |

O número alto de ❌ é esperado: o assessment é **aspiracional de mercado**. Cumprir todos os itens significa um produto operacionalmente maduro; hoje o Vitraux já cobre a base arquitetural e vários controles de API/UX, mas ainda falta o pacote clássico de escala (cache, CI, observabilidade, DI completo, carga).

---

## Detalhamento

### ARCH-01 — Separação em camadas

✅ Cumprido. O fluxo típico é `app/api/**/route.ts` → controller → use case → repository/service. Pastas `src/controllers`, `src/useCases`, `src/repositories`, `src/services` e `src/container` tornam a responsabilidade visível. Quebras óbvias de camada (Prisma no componente React, regra de negócio na rota) não são o padrão do projeto.

### ARCH-02 — Controllers finos

✅ Cumprido. Controllers (ex. `Image.controller.ts`, `Auth.controller.ts`) delegam a rotas/handlers e use cases; validação e orquestração ficam fora de um “god controller”. Isso reduz acoplamento web ↔ domínio e facilita trocar o transporte HTTP.

### ARCH-03 — Use cases como unidade de aplicação

✅ Cumprido. Use cases estendem o master port (`UseCase.masterport.ts`) com `run`/`execute`, o que padroniza entrada/saída e erros. A regra de aplicação permanece testável via Jest sem subir o Next.

### ARCH-04 — Persistência atrás de repositories

✅ Cumprido. Consultas Prisma ficam em `*.repository.ts`. Use cases importam repositórios (ainda que os instanciem) e não espalham queries no front. Scripts de operador ficam em `scripts/`, separados do runtime web.

### ARCH-05 — Fronteiras sem vazamento

✅ Cumprido (2026-08-25). Leituras sem TX desnecessária (DATA-05); storage em fases ADR-007 (COUP-03); Prisma via `getPrismaClient` / `runInTransaction` sem classe `DbCommander`; ESLint barra `getPrismaClient()` em use cases; Email/Spaces como singletons de processo. Residual de ports (DI-04) permanece Importante, não crítico de fronteira TX.

### DI-01 — Composition root

✅ Cumprido. `src/container/dependencies.ts` centraliza a montagem de use cases e cacheia o grafo no módulo.

### DI-02 — Repositories/services injetados

N/A (decisão de produto / ADR-008). Injetar repositories no construtor **não** melhora latência de endpoint e conflita com o client da TX. Padrão intencional: `new Repo(injectables.prisma)` no `execute`. Services pesados usam getters singleton (`getEmailService`, `getStorageService`, `getStorageUrlService`), não DI de repository.

### DI-03 — Cliente DB singleton

✅ Cumprido. `getPrismaClient()` em `Db.manager.ts` evita `PrismaClient` por request. Health e runtime compartilham o singleton.

### DI-04 — Portas para I/O externo

❌ Não cumprido. E-mail e storage têm classes concretas usadas diretamente; não há porta/interface injetável estável no composition root para todos os I/O. Sem isso, testes e troca de provedor (Brevo → outro, Spaces → outro S3) ficam mais caros e o acoplamento cresce.

### DATA-01 — Índices nas consultas quentes

✅ Cumprido. Modelos críticos (`Image`, `ActiveSession`, `SessionEvent`, uniques de User) possuem índices alinhados a listagem por dono/visibilidade/data e lookup de sessão. Sem índices básicos, listagens e auth derreteriam sob carga mínima.

### DATA-02 — Índices para jobs/filtros

❌ Não cumprido. `File` orphan purge e filtros por `ownerId`/`status` carecem de índices dedicados; busca `contains` em título/descrição não tem estratégia de índice/texto. Jobs e buscas viram collection scans quando o volume cresce.

### DATA-03 — Paginação cursor

✅ Cumprido. Listagem de imagens usa cursor `createdAt`+`id` com page size (~40). Evita `skip` caro e resposta ilimitada — controle fundamental de estabilidade sob crescimento do acervo.

### DATA-04 — Sem scan O(n usuários) no hot path

❌ Não cumprido. `listIdsHiddenFromGlobalMosaic` carrega settings de usuários ativos para filtrar o mosaico global. Em escala, isso vira latência e memória lineares no número de contas. O esperado de mercado é índice/flag denormalizada ou query invertida.

### DATA-05 — Transações só quando necessário

❌ Não cumprido. O master port envolve **toda** execução em `$transaction`, inclusive leituras. Transações longas/amplas aumentam contenção, latência e custo no Mongo sem ganho de consistência na maioria dos GETs.

### DATA-06 — Pool / connection limits

❌ Não cumprido. Não há documentação operacional de `connection_limit`/pool Prisma↔Mongo nem testes de saturação. Em multi-instância, o default pode esgotar o DB silenciosamente.

### DATA-07 — Fan-out de presign

❌ Não cumprido. Listagens presignam URLs com `Promise.all` por item. Correto funcionalmente (authz + URL curta), mas sob carga é N chamadas/assinaturas por página. Padrão maduro: batch, cache de URL até TTL, ou edge caching com chave opaca.

### CACHE-01 — Cache de leitura

❌ Não cumprido. Não há Redis/`unstable_cache`/camada de cache de aplicação para mosaico, perfil ou settings. Todo hit vai ao Mongo/Spaces. Sem cache, escala de leitura depende só do DB.

### CACHE-02 — Cache-Control HTTP

❌ Não cumprido. APIs e páginas dinâmicas não expõem política de cache HTTP para conteúdo público cacheável (quando seguro). CDN/browser não ajudam a amortizar origem.

### CACHE-03 — Invalidação

❌ Não cumprido. Sem cache não há invalidação; ao introduzir cache, mutações (upload, visibility, settings) precisam invalidar chaves de forma explícita — item permanece aberto até existir o desenho.

### FE-01 — App Router híbrido

✅ Cumprido. Rotas em `app/[locale]` misturam server components e client islands (formulários, mosaico). Base alinhada ao Next 15.

### FE-02 — Loading/Suspense de rota

✅ Cumprido. `loading.tsx` em `app/[locale]` (home, images, profile, config, deep link) com `MosaicFeedSkeleton`/`FormPageSkeleton`; feed client-side também usa skeletons no lugar de texto vazio.

### FE-03 — next/image

❌ Não cumprido. Mosaico usa `<img>` nativo (eslint desabilitado para `next/image`). Perde-se otimização/resize/srcset do Next, salvo política alternativa documentada (ex.: só URLs assinadas + CDN próprio).

### FE-04 — Lazy-load no mosaico

✅ Cumprido. `loading="lazy"` no mosaico evita baixar o acervo inteiro de uma vez — ganho básico de rede e memória no cliente.

### FE-05 — Orçamento de bundle

❌ Não cumprido. Sem `@next/bundle-analyzer` nem budgets no CI. Regressões de JS cliente (Radix, forms, mosaico) passam despercebidas.

### FE-06 — Feed sem waterfall cliente

❌ Não cumprido. O feed busca dados no cliente após hidratar, em vez de RSC/streaming da primeira página. Isso adiciona RTTs e piora LCP/TTFB percebido.

### FE-07 — Skeletons

✅ Cumprido. Há skeletons/`aria-busy` no mosaico e load-more, o que melhora usabilidade percebida mesmo antes de otimizar o caminho de dados.

### API-01 — Validação de entrada

✅ Cumprido. Rotas usam Zod/schemas e limites (metadata, body). Rejeitar cedo evita trabalho inútil no DB e falhas opacas.

### API-02 — Rate limit auth

✅ Cumprido. Login/cadastro/senha/nickname (e fluxos sensíveis) têm rate limit + lockout. Protege estabilidade sob stuffing e também CPU (Argon2).

### API-03 — Rate limit amplo

❌ Não cumprido. Listagem, upload e import não têm o mesmo rigor de quota por IP/usuário. Abuso de leitura/escrita ainda pode degradar a origem.

### API-04 — Timeouts de I/O

✅ Cumprido. E-mail e import remoto usam timeout/`AbortSignal`. Evita request pendurado eternamente em dependência externa.

### API-05 — Retries com backoff

❌ Não cumprido. Falhas transitórias (Brevo 429/5xx, Spaces) não têm retry padronizado com jitter. Confiabilidade sob blips de rede fica frágil.

### API-06 — Idempotency keys

❌ Não cumprido. Mutações (upload, report, reset) não aceitam chave de idempotência. Retries de cliente podem duplicar efeitos colaterais.

### API-07 — Compressão / payloads enxutos

❌ Não cumprido. Não há política explícita de compressão nem auditoria contínua de payload (campos extras no JSON). Em mobile/latência alta, bytes importam.

### API-08 — Limites de body

✅ Cumprido. Teto de JSON/base64 e metadados reduz DoS de memória — também é requisito de performance/estabilidade, não só segurança.

### OBS-01 — Logging

✅ Cumprido. `Log.manager` com níveis e redação. Sem log básico, incidentes de performance são cegos.

### OBS-02 — Health checks

✅ Cumprido. `/api/health` e health de DB com restrição de acesso + script `healthcheck`. Base para orquestradores e probes.

### OBS-03 — Métricas

❌ Não cumprido. Sem histograms de latência, contadores de erro, saturação de pool ou fila. Sem métricas não há SLO mensurável.

### OBS-04 — Tracing

❌ Não cumprido. `instrumentation.ts` só valida env; não há OTEL/APM. Diagnóstico de lentidão cross-service (app→Mongo→Spaces) fica manual.

### OBS-05 — Alertas / SLO

❌ Não cumprido. Sem error budget nem paging. Degradação só é percebida por usuário humano.

### REL-01 — Erros tipados

✅ Cumprido. Hierarquia de erros + `handleRoute` padroniza status e corpo. Falhas previsíveis melhoram UX e observabilidade futura.

### REL-02 — Circuit breaker

❌ Não cumprido. Dependências externas não têm circuit breaker/bulkhead. Uma lentidão no Spaces/Brevo pode contaminar o event loop/workers.

### REL-03 — Graceful shutdown

❌ Não cumprido. Não há handler de SIGTERM que pare de aceitar tráfego e feche o Prisma limpo. Em deploy rolling, requests morrem no meio.

### REL-04 — Jobs fora do request

✅ Cumprido. Purge de retenção via `npm run cron` / CronJob, não no hot path HTTP. Padrão correto para trabalho periódico.

### REL-05 — Filas assíncronas

❌ Não cumprido. Trabalho pesado (presign em massa, e-mail, import) ainda é síncrono no request. Filas (BullMQ/SQS/etc.) isolam picos.

### SCALE-01 — Sessão sem sticky

✅ Cumprido. JWT em cookie permite múltiplas instâncias sem affinidade de sessão (desde que o secret seja compartilhado). Bom ponto de partida horizontal.

### SCALE-02 — Rate limit distribuído

❌ Não cumprido. Rate limit in-memory por processo; com N réplicas o limite efetivo multiplica. Mercado exige store compartilhado (Redis).

### SCALE-03 — CDN / edge de assets

❌ Não cumprido. Leitura via presign direto na origem Spaces; sem estratégia de CDN/cache edge documentada para hot assets públicos.

### SCALE-04 — Teste multi-instância

❌ Não cumprido. Não há evidência de smoke com ≥2 instâncias (rate limit, uploads, sessões). Escala “no papel” ≠ escala verificada.

### QA-01 — Testes unitários de use cases

✅ Cumprido. Há bateria Jest ampla em `tests/useCases` e segurança. Regressões funcionais básicas são pegáveis antes de produção.

### QA-02 — Coverage thresholds

❌ Não cumprido. Jest sem floors de cobertura no CI. Código morto e caminhos críticos descobertos podem ficar sem teste sem alarme.

### QA-03 — Testes de carga

❌ Não cumprido. Sem k6/Artillery (ou similar) para listagem/auth/upload. Performance só é “sentida”, não medida.

### QA-04 — Integração com Mongo

❌ Não cumprido. Testes mockam repositórios; não há harness de integração contra Mongo. Bugs de índice/query só aparecem em runtime.

### QA-05 — E2E críticos

❌ Não cumprido. Puppeteer no repo serve export Pinterest, não E2E do produto. Fluxos login→mosaico→upload não têm rede de segurança automatizada.

### CI-01 — Qualidade local

✅ Cumprido. ESLint, Prettier, husky e lint-staged reduzem ruído e inconsistência antes do push.

### CI-02 — Pipeline CI

❌ Não cumprido. Não há workflows em `.github/workflows`. PRs podem mergear sem gate automático.

### CI-03 — Typecheck

❌ Não cumprido. Não há script `typecheck`/`tsc --noEmit` no `package.json`. Erros de tipo podem escapar se o build Next não for rodado.

### CI-04 — Build+test no gate

❌ Não cumprido. Sem CI, build e `npm test` não são obrigatórios no merge. Regressões de compilação/testes chegam tarde.

### UX-01 — i18n

✅ Cumprido. UI e textos legais em pt/en/es. Usabilidade internacional básica atendida.

### UX-02 — a11y básica

✅ Cumprido. Uso de aria, focus rings, dialogs Radix, regiões live em forms. Não é auditoria WCAG completa, mas o baseline de mercado para app autenticado está presente.

### UX-03 — Error boundaries de rota

✅ Cumprido. `error.tsx` em `app/[locale]` com copy pt/en/es, botão “Tentar novamente” (`reset`) e link para o início.

### UX-04 — Erros de rede consistentes

✅ Cumprido parcialmente. `src/lib/api-error.ts` classifica timeout/401/500/rede; `auth-client`/`images-client` usam `fetchApi`/`parseApiResponse`; mosaico, upload e login exibem mensagens i18n via helper + toast.

### UX-05 — Progresso em ações longas

✅ Cumprido. Upload/feed apresentam estados de progresso/busy. Evita duplo-submit e ansiedade em operações lentas.

### COUP-01 — UI sem infra

✅ Cumprido. Componentes falam com `lib/*-client` / APIs, não com Prisma/Spaces. Mantém o front substituível e testável.

### COUP-02 — Sem `new` de infra no use case

❌ Não cumprido. Instanciação de repositories/services no use case acopla aplicação à infra concreta e dificulta testes/performance harnesses.

### COUP-03 — Um cliente DB por unidade de trabalho

❌ Não cumprido. Mistura de `injectables.prisma` (TX) com `DbCommander.getClient()` (root) no mesmo fluxo quebra atomicidade e pode ler dados sujos/parciais.

### COUP-04 — Operação ≠ produto

✅ Cumprido. Scripts admin/cron ficam fora do bundle de request do usuário e recusam production quando aplicável. Evita acoplar ferramentas de operador ao hot path.

### COUP-05 — Ports explícitos

❌ Não cumprido. Faltam interfaces de porta estáveis entre aplicação e adapters. Imports cruzados de detalhes (S3 SDK shapes, Prisma enums em excesso nas bordas) aumentam o custo de evolução.

---

## Como usar este assessment

1. Trate cada ❌ como item de backlog priorizável (não como “bug único”).
2. Ao fechar um item, marque ✅ e registre evidência (PR/path) no detalhe.
3. Ordem sugerida de alto impacto: **CI-02/03/04** → **DATA-04/05/07** → **DI-02/COUP-02/03** → **CACHE-01** → **SCALE-02** → **OBS-03/04** → **QA-03/05** → restante FE/UX.
4. Segurança e privacidade **não** substituem este arquivo: uma app pode ser segura e ainda assim lenta, acoplada ou inobservável.

## Relação com outros documentos

| Documento                   | Papel                                   |
| --------------------------- | --------------------------------------- |
| `SECURITY-ASSESSMENT.md`    | Controles de segurança absolutos        |
| `PRIVACY-ASSESSMENT.md`     | Controles LGPD/GDPR absolutos           |
| `SECURITY-REPORT.md`        | Histórico de pentest/mitigações         |
| `PERFORMANCE-ASSESSMENT.md` | Este checklist de qualidade/performance |
