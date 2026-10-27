# INIT — Guia para elaborar perguntas sobre o sistema que usará este boilerplate

**Para quem é este arquivo:** um modelo de IA (ou pessoa) que vai **entrevistar** o responsável por um sistema novo que nascerá deste boilerplate, antes de qualquer código. O objetivo é sair da entrevista com uma **especificação** (template na seção 7) que diga, feature por feature, o que fica, o que sai, o que muda e o que falta construir.

Este arquivo lista **tudo que o boilerplate já traz**, o estado padrão de cada recurso, o que é configurável e as **perguntas** que decidem o destino de cada um. Fatos detalhados e atualizados estão nos arquivos de contexto — leia-os antes de perguntar:

| Leia                                                                         | Para saber                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`CONTEXT.md`](CONTEXT.md)                                                   | Produto, papéis, conta, integrações opcionais                        |
| [`CONTEXT-ARCHITECTURE.md`](CONTEXT-ARCHITECTURE.md)                         | Camadas, env, rotas, segurança, PWA, push, IA                        |
| [`CONTEXT-ENTITIES.md`](CONTEXT-ENTITIES.md)                                 | Models e invariantes de dados                                        |
| [`CONTEXT-CODE.md`](CONTEXT-CODE.md)                                         | Inventário de código para reaproveitar                               |
| [`CONTEXT-DS.md`](CONTEXT-DS.md)                                             | Design system                                                        |
| [`AGENTS.md`](AGENTS.md)                                                     | Regras do repositório (issue → branch → PR, camadas, i18n, contrato) |
| [`docs/issues/porte-tribal-backlog.md`](docs/issues/porte-tribal-backlog.md) | O que **não** existe, mas foi avaliado                               |

---

## 1. Instruções para a IA que conduz a entrevista

1. **Leia os arquivos acima primeiro.** Não pergunte o que já está documentado (ex.: "o login tem verificação de e-mail?" — tem). Pergunte o que **depende do sistema novo**.
2. **Pergunte por área, uma de cada vez** (seção 3), em rodadas curtas de **3 a 6 perguntas**. Comece pelas transversais (seção 4): sem o domínio claro, as perguntas de feature não fazem sentido.
3. **Cada pergunta deve levar a uma decisão**: manter, remover, configurar, estender ou construir. Se a resposta não muda nada no código, não pergunte.
4. **Ofereça um padrão** e peça confirmação ("Sugiro manter o padrão X, porque Y. Serve?"). O responsável responde mais rápido a uma sugestão do que a uma pergunta aberta.
5. **Não assuma.** Resposta vaga ("depende", "talvez") vira **pendência** na especificação, nunca decisão.
6. **Marque o que precisa de terceiros**: jurídico (termos, privacidade, idade mínima, DPAs), contas (OpenAI, Brevo, Google, DigitalOcean), marca (nome, ícones, cores).
7. **Respeite as regras do repositório** ao propor trabalho: nada de tarefa ad-hoc — cada entrega vira **issue → branch → PR**; endpoint novo exige `requests/*.http` + `docs/openapi.yaml`; texto de UI nos três idiomas; dado pessoal novo exige exportação LGPD, retenção e exclusão.
8. **Ao terminar**, devolva a especificação no formato da seção 7 e a lista de issues sugeridas (uma por entrega).

### Níveis de decisão (use estes rótulos na especificação)

| Rótulo         | Significa                                              |
| -------------- | ------------------------------------------------------ |
| **MANTER**     | Fica como está                                         |
| **CONFIGURAR** | Fica, mas muda valor/env/texto/marca (sem código novo) |
| **ESTENDER**   | Fica e ganha comportamento do domínio                  |
| **REMOVER**    | Sai do projeto (a seção 8 diz como)                    |
| **CONSTRUIR**  | Não existe no boilerplate; entra como feature nova     |
| **PENDENTE**   | Falta informação; dono e prazo para resolver           |

---

## 2. O que o boilerplate é (em uma frase)

Um **starter** Next.js 15 (App Router, React 19, TypeScript strict) com Prisma + **MongoDB**, autenticação completa, perfil, configurações, upload de imagens (DigitalOcean Spaces), e-mail transacional (Brevo), design system, PWA, notificações, IA opcional e arquitetura em camadas — **sem nenhuma regra de negócio de domínio**. Idiomas: **pt, en, es**.

**Não é opinionado sobre o domínio.** Tudo que o sistema novo faz de específico (entidades, telas, regras) **ainda não existe**: é o que a entrevista precisa descobrir.

---

## 3. Features existentes e perguntas por área

Para cada área: **estado** (o que já funciona), **liga/desliga** (como se configura), **perguntas** (o que decide).

### 3.1 Cadastro, login e senha

- **Estado:** cadastro (nickname, e-mail, senha, data de nascimento, aceite de termos e privacidade), login por e-mail ou nickname, logout, "esqueci a senha", troca de senha. Senha de 8–128 caracteres com ao menos 3 entre minúscula, maiúscula, dígito e símbolo; hash `argon2`. Rate limit nas rotas de autenticação. Sessão por JWT em cookie `HttpOnly` (TTL padrão 7 dias).
- **Liga/desliga:** `JWT_TTL_SECONDS`, `JWT_ISSUER`, `JWT_AUDIENCE`. Política de senha em `src/utils/passwordPolicy.ts`.
- **2FA (TOTP, opcional):** só liga com `TWO_FACTOR_ENCRYPTION_KEY` (`npm run two-factor:key`; **guarde backup**). Ativação no perfil, 10 códigos de recuperação de uso único, login em duas etapas; celular perdido: `npm run two-factor:reset`. **Não cobre** o login com Google nem gera QR code. [`docs/operators/two-factor.md`](docs/operators/two-factor.md).
- **Perguntas:**
    - Quem se cadastra (público aberto, convite, só empregados)? Cadastro aberto é aceitável?
    - Login deve ser por e-mail, nickname ou ambos? O **nickname** faz sentido no domínio (identidade pública) ou deve virar "nome"?
    - 7 dias de sessão serve? Precisa de "lembrar de mim", sessão curta, SSO corporativo? (2FA por app autenticador **já existe**, opcional: precisa ser obrigatório para algum papel?)
    - A política de senha é adequada para o público e para compliance?
    - Há cadastro por convite, aprovação manual ou lista de e-mails permitidos?

### 3.2 Idade mínima e dados do cadastro

- **Estado:** exige data de nascimento e **idade mínima de 18 anos** (`MINIMUM_AGE_YEARS`, UTC); a data é guardada e **não** vai em DTO público.
- **Perguntas:** a idade mínima é 18? Há conteúdo sensível ou público menor de idade? Precisa de outros campos no cadastro (nome completo, telefone, documento, empresa, endereço)? Algum é dado sensível?

### 3.3 Verificação de e-mail e troca de e-mail

- **Estado:** desafios `verify`, `change_old`, `change_new`, `password_reset` (código de 8 caracteres, TTL de 1 h). Troca de e-mail confirma nos dois endereços.
- **Perguntas:** conta sem e-mail verificado pode fazer o quê? Algum recurso do domínio **exige** e-mail verificado? O texto dos e-mails (assunto, corpo, marca) deve mudar?

### 3.4 Login com Google (opcional)

- **Estado:** Authorization Code; vínculo por e-mail com confirmação por senha quando já existe conta; cadastro complementar (nickname, data de nascimento).
- **Liga/desliga:** `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI`. Sem eles o botão não aparece.
- **Perguntas:** Google basta ou precisa de outros provedores (Microsoft, Apple, GitHub, SAML/OIDC corporativo)? Só Google Workspace de um domínio?

### 3.5 Perfil, sessões e dispositivos

- **Estado:** editar nome, nickname, foto; ver estatísticas de armazenamento (arquivos e uso da cota, com barra); listar e revogar sessões/dispositivos; aviso por e-mail de login em dispositivo novo.
- **Perguntas:** que dados de perfil o domínio exige (cargo, bio, links, preferências)? O perfil é público para outros usuários? Há "usuário público" (página de perfil visível a terceiros)?

### 3.6 Exclusão de conta e LGPD

- **Estado:** exclusão com **quarentena de 30 dias** (cancelar/manter ao entrar); depois o job `retention-purge` anonimiza a conta e apaga arquivos. **Exportação de dados** (`GET /api/v1/users/me/export`): perfil, arquivos, notificações, aparelhos de push (só a data) e chamadas de IA.
- **Perguntas:** 30 dias de quarentena serve? Há dados do domínio que precisam ser **retidos por obrigação legal** mesmo após exclusão (financeiro, fiscal, auditoria)? Que dados do domínio entram na exportação? Quem é o encarregado (DPO) e o contato de privacidade?

### 3.7 Papéis, admin e impersonamento

- **Estado:** dois papéis, `USER` e `ADMIN`. Admin acessa `/admin` (lista de usuários com e-mail mascarado) e gera **link de acesso** de 10 minutos para atuar como um usuário comum (suporte). Criar admin é só por script (`npm run change-user-role`). Impersonamento bloqueia troca de senha/e-mail, exclusão, exportação, sessões e push; **permite** editar perfil.
- **Perguntas:**

    - Dois papéis bastam? Há perfis como gestor, operador, cliente, parceiro, somente leitura? Permissões **por recurso** (RBAC/ABAC) ou **por organização/tenant**?
    - O sistema é **multi-tenant** (várias empresas/equipes isoladas)? Um usuário pertence a mais de uma?
    - O admin precisa de mais que listar usuários (suspender, banir, editar, ver logs, relatórios)?
    - Impersonamento é desejável (privacidade, política da empresa)? 10 minutos serve? O que **não** pode ser feito como o usuário?
    - Quem pode ser admin e como é aprovado?

- **Auditoria:** trilha append-only (`AuditEvent`) de ações sensíveis (impersonamento, senha, e-mail, exclusão de conta, 2FA, ações de operador), aba "Auditoria" em `/admin`, retenção de 365 dias (`AUDIT_LOG_RETENTION_DAYS`), entra na exportação LGPD. **Perguntas:** há requisito de auditoria além disso (outras ações, retenção maior, exportação para SIEM)? [`docs/operators/audit-log.md`](docs/operators/audit-log.md).

### 3.7.1 Planos, cotas e cobrança

- **Estado:** **só** uma cota fixa de armazenamento (1 GiB por usuário). Não há planos, níveis, cobrança nem checkout.
- **Perguntas:** há planos pagos ou níveis? Cobrança (qual provedor, recorrência, impostos, nota fiscal)? Cotas além de armazenamento (usuários, chamadas de IA, projetos)? Período de teste? → provável **CONSTRUIR**.

### 3.8 Configurações, tema e idioma

- **Estado:** tema claro/escuro e idioma (`pt`/`en`/`es`), salvos no perfil e em cookies; só duas settings (`darkMode`, `language`).
- **Perguntas:** quais idiomas realmente? Algum a mais ou a menos? Que outras **preferências do usuário** o domínio terá (notificações por tipo, fuso horário, formato de data/moeda, densidade)? Tema escuro é requisito?

### 3.9 Armazenamento de imagens

- **Estado:** DigitalOcean Spaces **privado** com URL assinada. Todo upload é normalizado para **WebP** (avatar quadrado 512 px, galeria até 1600 px), ganha **thumbnail de 200 px**; recusa SVG e imagens com mais de 40 milhões de pixels. Cota de 1 GiB por usuário. Foto de perfil com recorte no cliente.
- **Liga/desliga:** `SPACES_*`; cota em `src/constants/storageQuota.ts`.
- **Perguntas:** o sistema guarda **outros tipos de arquivo** (PDF, vídeo, planilhas, anexos)? Tamanho máximo e tipos? Quem pode ver cada arquivo (privado, compartilhado, público)? Precisa de antivírus/moderação? Outro provedor de storage (S3, GCS, Azure)? Região/residência dos dados? Quanto de armazenamento por usuário?
- **Atenção:** o pipeline atual **só trata imagem**. Outros arquivos exigem trabalho novo.

### 3.10 E-mail transacional

- **Estado:** Brevo (obrigatório em produção); `none`/`disabled` só em dev. Usado em verificação, troca de e-mail, recuperação de senha e aviso de novo dispositivo.
- **Perguntas:** Brevo é o provedor? Domínio e remetente (`EMAIL_FROM`)? Precisa de **outros e-mails** (boas-vindas, relatórios, convites, recibos)? Templates com marca? Idiomas dos e-mails?

### 3.11 Notificações in-app e Web Push (opcional)

- **Estado:** sino com contador e página `/notifications`; push por aparelho (opt-in), só com `VAPID_*`. Outros use cases notificam por `CreateNotification`. O endpoint de push só vale para FCM, Mozilla, Windows e Apple.
- **Perguntas:** que **eventos** do domínio geram notificação (lista concreta)? Precisam de push ou o sino basta? Preferências por tipo de evento? Notificação por e-mail/SMS/WhatsApp? Tempo real (hoje é polling de 60 s)? Broadcast para todos os usuários?

### 3.12 PWA e atualização

- **Estado:** manifest, ícones de **placeholder**, service worker (sem cache de HTML), offline → `/offline.html`, erro 5xx → `/error.html`, banner de instalação (só logado, dispensável), atualização forçada por mudança de `version` no `package.json`. **Sempre ativo** hoje; desligar exige remover código.
- **Perguntas:** o sistema deve ser instalável (PWA)? O banner de instalação deve aparecer? **Uso offline** é requisito (ler, escrever, sincronizar)? → isso é **CONSTRUIR** (offline-first). Qual nome, cores e ícones? O recarregamento automático por versão é aceitável para o público?

### 3.13 IA (opcional)

- **Estado:** `AIService` com OpenAI (resumo, título, classificação, texto livre), atrás de `AI_PROVIDER=openai` **e** da feature flag `ai_enabled`; auditoria em `AiLog` (prompt, resposta, tokens; retenção de 90 dias). **Sem rota HTTP**: só use cases. Modelo por env (default `gpt-5.4-mini`).
- **Perguntas:** o sistema usa IA? Para quê, exatamente (resumir, classificar, gerar texto, chat, busca semântica, extração de dados, imagens)? Quem pode usar e **quanto** (cota/custo por usuário)? Que dados do usuário vão ao fornecedor (PII, documentos)? OpenAI é aceitável juridicamente ou precisa de outro fornecedor/modelo local? Precisa de **chat com contexto**, RAG, ferramentas/agentes? → vários desses são **CONSTRUIR**.

### 3.14 Feature flags

- **Estado:** coleção append-only, valor vigente = registro mais recente, cache de 30 s; hoje só `ai_enabled`. Alterna por `npm run toggle-feature-flag`.
- **Perguntas:** há recursos a liberar gradualmente, por usuário/grupo/porcentagem, ou testes A/B? Precisa de painel para alternar flags? (Hoje é só por script, global.)

### 3.15 Páginas legais e consentimento

- **Estado:** Termos e Política de Privacidade em `content/legal/*.{pt,en,es}.md` (**texto genérico do projeto de origem**), versionados em `src/constants/legal.ts` (aceite guarda a versão); aviso de cookies; encarregado e contato de privacidade **fixos no código**.
- **Perguntas:** quem é o controlador e o encarregado? Os termos e a privacidade já existem ou serão escritos? Precisam de revisão jurídica? Há **marketing/analytics** (consentimento de cookies granular)? Que suboperadores o sistema usa (preencher `docs/operators/subprocessors-ropa.md`)? Transferência internacional (Spaces em `nyc3`, OpenAI, push)? Região dos dados no Brasil?

### 3.16 Erros, resiliência e observabilidade

- **Estado:** `error-guard` (chunk quebrado → `/error.html`), `global-error`, tela de erro com "tentar de novo"; circuit breaker + retry nas integrações; log estruturado com redação de segredos (`LOG_LEVEL`); healthcheck por CLI (`npm run healthcheck`) e por HTTP (`/api/health`, só loopback ou token).
- **Perguntas:** onde os logs vão (agregador, retenção de 90 dias)? Precisa de **monitoramento de erro** (Sentry), métricas, tracing, alertas, status page? Há SLA/SLO? Há canal para o usuário **reportar problema**? (Hoje não existe: backlog.)

- **Observabilidade:** `requestId` em header, corpo de erro e logs; log JSON em produção (`LOG_FORMAT`); gancho `registerErrorReporter` para Sentry/OTel (sem SDK embutido). **Perguntas:** qual ferramenta de erros/métricas/tracing? Há SLA e alertas? [`docs/operators/observability.md`](docs/operators/observability.md).
- **Jobs em background:** fila no Mongo com retry/backoff (hoje só `email.send`; os fluxos de e-mail/push ainda enviam inline). Worker no processo web. **Perguntas:** que tarefas pesadas ou agendadas o domínio tem (relatórios, importações, e-mails em lote)? Precisa de processo de worker separado? [`docs/operators/jobs.md`](docs/operators/jobs.md).

### 3.17 Segurança

- **Estado:** CSRF por origem, cabeçalhos de segurança (HSTS, `X-Frame-Options: DENY`, CSP em report-only), proteção SSRF em downloads de imagem e endpoints de push, rate limit **em memória por instância**, cookies `__Host-` em HTTPS, redação de segredos em log.
- **Perguntas:** há requisito de pentest, SOC 2, ISO 27001, LGPD formal? Rate limit por instância basta ou precisa de limite **global** (Redis)? CSP deve ser enforçada? Há WAF/CDN na frente? Dados sensíveis específicos (saúde, financeiro, menores)?

### 3.18 Design system e telas

- **Estado:** ~42 componentes em `src/design-system/` (inclui `Modal`, `DataTable`, `Tabs`, `Badge`, `Skeleton`, `EmptyState`, `Pagination`) (catálogo vivo em `/ds-components`), Tailwind 4 + Radix, layout com **sidebar de ícones** (menu em `Sheet` no mobile), tema claro/escuro. Tela inicial é um "Hello World" sem conteúdo.
- **Perguntas:** há **identidade visual** (nome, logo, cores, tipografia, tom de voz)? Referências de layout? Que **telas** o sistema tem (liste as principais e quem acessa cada uma)? A navegação em sidebar de ícones serve ou precisa de menu/topbar? Precisa de landing page pública, onboarding, dashboard, tabelas, formulários longos, gráficos, mapas, editor de texto rico? → quase tudo isso é **CONSTRUIR**.

### 3.19 Infraestrutura, operação e deploy

- **Estado:** Node `22.19.0`, MongoDB com **replica set** e autenticação (obrigatório: transações), `docker-compose.yaml` só para desenvolvimento, **`Dockerfile` de produção + `docker-compose.app.yaml`** ([`docs/operators/docker.md`](docs/operators/docker.md); imagem ainda não construída em um daemon real), build `next build`/`next start`, job `retention-purge` (manifesto de CronJob em `deploy/cron/`), scripts de operador (`scripts/README.md`), CI no GitHub (lint, typecheck, test, build; só em PR) e workflow `E2E`. **Pensado para uma instância** (limitações em [`docs/known-issues/scalability.md`](docs/known-issues/scalability.md)). **Sem script de deploy nem de backup.**
- **Perguntas:** onde roda (VPS, Kubernetes, Vercel, DigitalOcean App Platform)? **Uma ou várias instâncias** (afeta rate limit, cache de flags e realtime)? MongoDB gerenciado (Atlas) ou próprio? Backup e restauração (RPO/RTO)? Ambientes (dev/staging/prod) e domínios? Quem faz deploy e como (CI/CD, manual)? Orçamento? → deploy automatizado e backup são **CONSTRUIR**; N réplicas exigem resolver as issues de escalabilidade antes.

### 3.20 Testes, qualidade e processo

- **Estado:** Jest (~980 testes: use cases, repositories, serviços, componentes em jsdom), **Playwright E2E** em `e2e/` (12 casos, API + UI, workflow `E2E` verde no CI: [`docs/operators/e2e.md`](docs/operators/e2e.md)), teste de paridade de i18n, ESLint, Prettier, Husky. Processo **issue → branch → PR → review → label `Reviewed`**. Contrato: OpenAPI + `requests/*.http`.
- **Perguntas:** que cobertura e tipos de teste o projeto exige (E2E obrigatório no CI, carga, acessibilidade)? Quem revisa PRs? O fluxo de issues continua no GitHub Projects? Há branch `homolog`/staging?

---

## 4. Perguntas transversais (faça primeiro)

1. **O que é o sistema?** Em uma frase, e quem usa. Qual problema resolve? Qual o resultado de negócio esperado?
2. **Quem são os usuários?** Perfis, volume (hoje e em 12 meses), países/idiomas, dispositivos (mobile, desktop), acessibilidade.
3. **Quais são as entidades do domínio?** Liste os "substantivos" (pedido, projeto, paciente, produto…), como se relacionam e quem é dono de cada um. _(Isso vira models Prisma novos.)_
4. **Quais são os fluxos principais?** Os 3 a 5 caminhos que o usuário faz mais (passo a passo). _(Viram use cases e telas.)_
5. **Que regras de negócio, cálculos, estados e prazos existem?** (aprovação, status, SLA, regras de preço…)
6. **Integrações externas** além das do boilerplate: pagamento, ERP/CRM, WhatsApp/SMS, mapas, ClickSign, bancos, APIs públicas, webhooks de entrada e de saída.
7. **Dados:** de onde vêm os dados iniciais? Há migração de sistema legado? Importação/exportação (CSV, planilha, API)?
8. **Relatórios e busca:** o que precisa ser buscado/filtrado/exportado? Volume? Busca por texto livre?
9. **Prazos e prioridades:** o que é MVP e o que é depois? Há data-limite, evento ou cliente âncora?
10. **Compliance:** LGPD/GDPR, setor regulado (saúde, finanças, educação), retenção legal de dados, auditoria.
11. **Marca e produto:** nome, domínio, tom, referências visuais, concorrentes.
12. **Equipe e operação:** quem desenvolve, quem opera, quem dá suporte, quem é o dono do produto.

---

## 5. O que o boilerplate NÃO tem (provável CONSTRUIR)

Avaliado no tribalRPGBot e deixado de fora ([`docs/issues/porte-tribal-backlog.md`](docs/issues/porte-tribal-backlog.md)); pergunte se o sistema precisa de cada um:

| Capacidade                                   | Pergunta                                                   |
| -------------------------------------------- | ---------------------------------------------------------- |
| Níveis/planos e cotas por plano              | Há planos? Quais limites?                                  |
| Cobrança e checkout                          | Há pagamento? Qual provedor?                               |
| Reportar bug / pedir feature (`UserRequest`) | Precisa de canal de suporte dentro do app?                 |
| Offline-first (dados, fila de escrita)       | O usuário precisa trabalhar sem internet?                  |
| Tempo real (WebSocket/SSE)                   | Há chat, colaboração ao vivo, painel que atualiza sozinho? |
| Landing page, sobre, changelog público       | O produto tem site público e notas de versão?              |
| Deploy automatizado e restore de banco       | Como será o deploy e o backup?                             |
| Multi-tenant / organizações                  | Há empresas/equipes isoladas?                              |
| Permissões granulares                        | Além de `USER`/`ADMIN`, que perfis existem?                |
| Arquivos que não são imagem                  | PDF, vídeo, planilhas, anexos?                             |
| Busca, relatórios, gráficos                  | O que o usuário precisa consultar?                         |
| Webhooks e API pública para terceiros        | Outros sistemas consomem este?                             |
| SSO corporativo (SAML/OIDC)                  | Há exigência de login único corporativo?                   |
| E-mail marketing, analytics, A/B             | Há medição de produto ou campanhas?                        |

---

## 6. O que já existe de "exemplo" e deve ser limpo

Itens do projeto de origem ou de demonstração que o sistema novo normalmente **não quer**: pergunte e marque REMOVER/CONFIGURAR.

- **Marca/identidade:** `APP_NAME = 'App'` (`src/constants/app.ts`), ícones PWA de placeholder, `public/img/generic-sample-*.jpg`.
- **Legal:** `content/legal/*` (texto genérico, controlador "Caio Felipe Giasson"), `src/constants/legal.ts` (versões, encarregado e e-mail de contato).
- **Exemplos da arquitetura:** model `Example`, `/api/v1/examples`, `recoverOrGenerateExample`, `Example.service` (404 em produção).
- **Catálogo de componentes:** rota `/ds-components` (útil em dev; decidir se vai a produção).
- **Home:** `HomePageClient` ("Hello World").
- **Documentos do projeto de origem:** `ROADMAP.md`, `AI-READINESS-*`, `SECURITY-*`, `PRIVACY-*`, `PERFORMANCE-*` (assessments), `docs/issues/*` (refinamentos antigos).
- **Renomear tudo de uma vez:** `npm run init-project -- --name "..." [--privacy-officer ... --privacy-email ...] [--env] --confirm` troca nome, slug (JWT issuer/audience, `package.json`, cron), textos legais e gera o `.env`; faça o **dry-run** antes. O encarregado de privacidade padrão é pessoa real: troque. `npm run seed:dev` cria admin e usuário de desenvolvimento.
- **Variáveis e nomes:** `ENVIRONMENT`, buckets, `JWT_ISSUER/AUDIENCE` padrão `boilerplate-webapp`, nome do pacote em `package.json`.

---

## 7. Formato da especificação (saída da entrevista)

Entregue um documento com estas seções. Seja concreto; toda pendência tem **dono** e **data**.

```markdown
# Especificação — <nome do sistema>

## 1. Resumo

Uma frase, público, problema, resultado esperado, prazo/MVP.

## 2. Usuários e papéis

Tabela: papel | quem é | o que pode | quantos.
Multi-tenant: sim/não (como).

## 3. Entidades do domínio

Para cada: nome, campos principais, relações, dono, quem lê/escreve, retenção, dado pessoal? (sim/não).

## 4. Fluxos principais

Passo a passo dos 3–5 caminhos, com telas e regras.

## 5. Decisões sobre as features do boilerplate

Tabela: feature (seção 3 do INIT.md) | decisão (MANTER/CONFIGURAR/ESTENDER/REMOVER/CONSTRUIR/PENDENTE) | detalhe.

## 6. Features a construir

Lista priorizada (P0/P1/P2) com critérios de aceite resumidos.

## 7. Integrações e infraestrutura

Provedores, contas necessárias, ambientes, domínio, deploy, backup, observabilidade.

## 8. Compliance e jurídico

Controlador/encarregado, bases legais, retenção, suboperadores, transferência internacional, textos legais.

## 9. Marca e UX

Nome, logo, cores, tipografia, idiomas, referências, telas principais.

## 10. Riscos e pendências

Item | dono | data.

## 11. Issues sugeridas

Uma por entrega, na ordem: título, escopo, aceite, dependências.
```

---

## 8. Como remover o que não será usado

| Para remover…               | Faça                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login com Google            | Não configure `GOOGLE_OAUTH_*` (o botão some). Para apagar o código: use cases/rotas `auth/google/*`, `GoogleOAuth`, componentes `Google*`.                                                                                                                                          |
| IA                          | Deixe `AI_PROVIDER=none` e a flag `ai_enabled` desligada. Para apagar: `src/services/AI`, `AiLog`, `summarizeText`, `docs/operators/ai.md`.                                                                                                                                          |
| Web Push                    | Não configure `VAPID_*`. O sino continua. Para apagar o push: `WebPush`, `PushSubscription`, rotas `push/*`, toggle em Configurações.                                                                                                                                                |
| Notificações (sino e push)  | Remova `Notification`/`PushSubscription`, rotas `notifications/*` e `push/*`, o sino na `Sidebar`, `/notifications`.                                                                                                                                                                 |
| Banner de instalação do PWA | Remova `<PwaInstallBanner />` de `AppShell`.                                                                                                                                                                                                                                         |
| PWA inteiro                 | Remova `ServiceWorkerRegistrar` do `AppShell`, `src/app/manifest.ts`, `public/sw.js`, ícones e metadados em `[locale]/layout.tsx`. Mantenha `ForceAppUpdate` se quiser atualização forçada.                                                                                          |
| Admin e impersonamento      | Remova rotas `admin/*`, `auth/impersonate`, `/admin`, `ImpersonationConsumer`/`Banner` e as chamadas a `assertNotImpersonation`.                                                                                                                                                     |
| Feature flags               | Só se IA e outros recursos também saírem (`FeatureFlag`, manager, script).                                                                                                                                                                                                           |
| 2FA                         | Não configure `TWO_FACTOR_ENCRYPTION_KEY` (a seção some). Para apagar: `TwoFactor*`, use cases `*TwoFactor*`/`regenerateRecoveryCodes`, `utils/totp.ts`, `twoFactorCrypto.ts`, `twoFactorChallenge.ts`, `ProfileTwoFactorSection`, o passo 2 do `LoginForm` e o gate em `LoginUser`. |
| Audit log                   | Remova `AuditEvent`, as chamadas a `AuditEventRepository.record`, `/admin/audit-events`, a aba em `AdminPageClient`.                                                                                                                                                                 |
| Jobs em background          | `JOBS_WORKER=off`. Para apagar: `src/jobs`, `Job`, `JobRepository`, o start em `instrumentation-node.ts`.                                                                                                                                                                            |
| Exemplos                    | Apague `Example*`, `/api/v1/examples` e os testes correspondentes.                                                                                                                                                                                                                   |

Ao remover, atualize **na mesma PR**: `docs/openapi.yaml`, `requests/`, textos pt/en/es, testes, `CONTEXT*.md` e o `scripts/README.md`.

---

## 9. Checklist final da entrevista

- [ ] Domínio, usuários e entidades claros (seção 4, perguntas 1–5).
- [ ] Cada feature da seção 3 tem decisão registrada.
- [ ] Itens da seção 5 avaliados (construir ou descartar).
- [ ] Itens da seção 6 com destino definido.
- [ ] Integrações, contas e ambientes listados, com dono.
- [ ] Compliance e jurídico com responsável; textos legais com prazo.
- [ ] Marca e idiomas definidos.
- [ ] MVP separado do restante, com prioridades.
- [ ] Pendências com dono e data.
- [ ] Issues sugeridas, uma por entrega.
