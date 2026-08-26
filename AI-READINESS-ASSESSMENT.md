# Avaliação absoluta de AI-readiness — repositórios

| Campo     | Valor                                                                                                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipo      | Referência **absoluta** de prontidão para contribuição por agentes de IA (não específica de um produto)                                                                                                                                                    |
| Data      | 2026-08-21                                                                                                                                                                                                                                                 |
| Propósito | Checklist de mercado: quanto mais itens ✅, menor o custo em tokens e maior a qualidade/velocidade das entregas de IAs no repositório. O assessment **não** descreve um codebase concreto — o confronto com um repo real fica no relatório correspondente. |
| Relatório | Confrontar com `AI-READINESS-REPORT.md` no repositório avaliado                                                                                                                                                                                            |

**Legenda:** ✅ cumprido · ❌ não cumprido

Um repositório AI-ready reduz ambiguidade: o agente encontra regras, arquitetura, exemplos e contratos sem explorar às cegas. Itens abaixo cobrem documentação para agentes, estrutura previsível, contratos tipados, testes como oráculo, tooling e higiene de contexto.

---

## Checklist

| Código      | Assessment | Descrição breve                                                                          |
| ----------- | ---------- | ---------------------------------------------------------------------------------------- |
| AGENT-01    | —          | Arquivo de instruções para agentes (`AGENTS.md` e/ou `CLAUDE.md` / copilot-instructions) |
| AGENT-02    | —          | Regras do projeto versionadas (Cursor rules / equivalent) cobrindo fluxo e limites       |
| AGENT-03    | —          | `CONTRIBUTING.md` com como rodar, testar, commit e abrir PR                              |
| AGENT-04    | —          | Memória de lições (`lessons.md` ou ADR de “erros já cometidos”)                          |
| DOC-01      | —          | README com stack, estrutura de pastas, comandos e mapa de módulos                        |
| DOC-02      | —          | Documento de arquitetura (camadas, dependências, diagramas)                              |
| DOC-03      | —          | Glossário de domínio / termos do produto                                                 |
| DOC-04      | —          | ADRs ou decisões registradas para escolhas não óbvias                                    |
| DOC-05      | —          | `.env.example` completo com comentários (sem secrets)                                    |
| STRUCT-01   | —          | Pastas por responsabilidade estáveis (ex.: controllers / useCases / repositories)        |
| STRUCT-02   | —          | Convenções de nomenclatura consistentes e documentadas                                   |
| STRUCT-03   | —          | Arquivos focados (evitar god-files > ~500–800 linhas de lógica)                          |
| STRUCT-04   | —          | Monorepo ou single-package explicitamente descrito                                       |
| STRUCT-05   | —          | Separação clara app vs scripts/ops vs docs                                               |
| CONTRACT-01 | —          | TypeScript (ou tipagem forte) com `strict` (ou equivalente)                              |
| CONTRACT-02 | —          | Validação de borda (Zod/OpenAPI schemas) alinhada às rotas                               |
| CONTRACT-03 | —          | Contrato HTTP documentado (OpenAPI, `.http`, ou tabela canônica)                         |
| CONTRACT-04 | —          | DTOs/public types estáveis nas bordas (não vazar ORM cru)                                |
| TEST-01     | —          | Testes unitários dos casos de uso / domínio críticos                                     |
| TEST-02     | —          | Espelhamento previsível `src/` ↔ `tests/` (ou colocation documentada)                   |
| TEST-03     | —          | Comando único de teste documentado (`npm test` / equivalente)                            |
| TEST-04     | —          | Fixtures/factories reutilizáveis (não só mocks ad hoc opacos)                            |
| TOOL-01     | —          | Lint + format automatizados (ESLint/Prettier ou equivalente)                             |
| TOOL-02     | —          | Typecheck no gate local/CI                                                               |
| TOOL-03     | —          | CI em PR (lint/test/build)                                                               |
| TOOL-04     | —          | Templates de issue e PR no GitHub/GitLab                                                 |
| TOOL-05     | —          | CODEOWNERS ou owners explícitos por área                                                 |
| CTX-01      | —          | `.gitignore` / ignore de agent cobrindo build, deps, secrets, artefatos grandes          |
| CTX-02      | —          | `.cursorignore` / equivalente para excluir ruído de contexto                             |
| CTX-03      | —          | Relatórios e assessments versionados com códigos estáveis                                |
| CTX-04      | —          | Issues refinadas (objetivo, aceite, escopo) em vez de one-liners                         |
| CTX-05      | —          | Workflow de PR review documentado para humanos e agentes                                 |
| I18N-01     | —          | Catálogos de texto centralizados (se o produto for multilíngue)                          |
| SCRIPT-01   | —          | Scripts de ops nomeados no package manager + doc mínima                                  |
| SCRIPT-02   | —          | Índice `scripts/README` ou seção README listando cada script                             |
| SAFE-01     | —          | Política explícita: não commitar secrets; exemplos mascarados                            |
| SAFE-02     | —          | Instruções do que o agente **não** deve fazer (force push, prod, etc.)                   |

> Preencha a coluna Assessment com ✅/❌ no relatório do repositório avaliado; este arquivo permanece genérico.

### Resumo (modelo)

Ao avaliar um repo, conte ✅ vs ❌. Meta prática de “muito pronto”: ≥80% ✅ nos grupos AGENT/DOC/STRUCT/CONTRACT/TEST/TOOL.

---

## Detalhamento

### AGENT-01 — Instruções para agentes

Arquivo na raiz (`AGENTS.md`, `CLAUDE.md` ou `.github/copilot-instructions.md`) dizendo: stack, como rodar, onde está a lógica, padrões obrigatórios, o que não tocar. Sem isso o agente rediscobre o projeto a cada sessão.

### AGENT-02 — Regras versionadas

Rules no repositório (ex. `.cursor/rules/*.mdc`) com fluxo de issues, review, segurança, escopo. Preferir always-apply só para o que for invariante; regras específicas por glob quando possível.

### AGENT-03 — CONTRIBUTING

Passos humanos e de agente: install, env, test, lint, branch, PR. Reduz perguntas e PRs incompletos.

### AGENT-04 — Lições aprendidas

`tasks/lessons.md` ou ADRs de falhas (“não faça X porque Y”) evitam o agente repetir bugs caros.

### DOC-01 — README operacional

Mapa de pastas, comandos, pré-requisitos (DB, Docker), links para docs longas. É o índice barato de tokens.

### DOC-02 — Arquitetura

Camadas, setas de dependência, onde vive I/O. Diagrama textual ou mermaid basta. Sem isso o agente viola camadas.

### DOC-03 — Glossário

Termos do domínio (ex.: mosaic, visibility, challenge) com definição de uma linha. Evita inventar nomes errados.

### DOC-04 — ADRs

Decisões (“por que JWT 7d”, “por que sem next/image”) em arquivos curtos. Impede refactors “criativos” destrutivos.

### DOC-05 — .env.example

Todas as vars necessárias com comentário; valores fake. Agente configura o ambiente sem ler secrets reais.

### STRUCT-01 — Pastas por responsabilidade

Convenção estável e óbvia. Agentes navegam por path, não por hopeline.

### STRUCT-02 — Nomenclatura

`*.usecase.ts`, `*.repository.ts`, etc., documentados. Busca por padrão funciona.

### STRUCT-03 — Arquivos focados

God-files forçam o agente a carregar milhares de tokens irrelevantes e errar merges. Extrair quando passar de ~500–800 linhas de lógica.

### STRUCT-04 — Forma do repo

Single package vs monorepo declarado; workspaces listados. Evita editar o pacote errado.

### STRUCT-05 — App vs ops vs docs

Scripts e docs fora do hot path da app. Agente não mistura CLI de operador com runtime.

### CONTRACT-01 — Tipagem estrita

`strict` reduz alucinações de tipos e quebras silenciosas.

### CONTRACT-02 — Validação de borda

Schemas compartilhados entre rota e teste. Agente estende contrato com segurança.

### CONTRACT-03 — Contrato HTTP

OpenAPI ou `requests/*.http` + tabela README. Agente não inventa paths.

### CONTRACT-04 — DTOs de borda

Não expor entidades Prisma cruas na API. Fronteiras claras guiam mudanças.

### TEST-01 — Testes de domínio

Use cases com testes são o melhor oráculo para o agente validar a própria mudança.

### TEST-02 — Espelhamento

`tests/useCases/foo.usecase.test.ts` ↔ `src/useCases/foo.usecase.ts`. Descoberta O(1).

### TEST-03 — Comando único

`npm test` documentado. Agente fecha o loop sem adivinhar.

### TEST-04 — Factories

Builders de user/image reduzem mocks frágeis e tokens de setup.

### TOOL-01 — Lint/format

Feedback imediato; menos nit de estilo na review.

### TOOL-02 — Typecheck

`tsc --noEmit` no gate. Pega erros que o agente introduz.

### TOOL-03 — CI

Mesmos checks na PR. Agente e humano compartilham a definição de “verde”.

### TOOL-04 — Templates

Issue/PR templates forçam aceite e test plan — input melhor para o agente.

### TOOL-05 — CODEOWNERS

Sinaliza quem/qual área; útil para roteamento (e para o agente saber criticidade).

### CTX-01 — Ignore de artefatos

Build, `node_modules`, dumps fora do índice. Menos lixo no contexto.

### CTX-02 — Ignore de agente

Excluir binários, exports gigantes, transcripts. Economia direta de tokens.

### CTX-03 — Assessments com códigos

IDs estáveis (AUTH-01, DATA-04) permitem o agente citar e atualizar status sem reescrever prosa.

### CTX-04 — Issues refinadas

Objetivo + aceite + fora de escopo. Agente implementa sem re-entrevistar.

### CTX-05 — Review workflow

Regras de PR (o que corrigir, labels) evitam pingue-pongue.

### I18N-01 — Catálogos

Textos em arquivos tipados/centrais. Agente não hardcoda strings soltas.

### SCRIPT-01 — Scripts nomeados

`package.json` scripts com nomes estáveis.

### SCRIPT-02 — Índice de scripts

Tabela “comando → efeito”. Evita rodar o script errado.

### SAFE-01 — Sem secrets

Política explícita + examples. Agente não cola `.env` em commit.

### SAFE-02 — Guardrails

“Não force push em main; não rodar contra prod; não pular hooks.” Em AGENT-01/rules.

---

## Como usar

1. Avaliar o repositório no `AI-READINESS-REPORT.md` (✅/❌ por código).
2. Priorizar AGENT-01, DOC-01/02, CONTRACT-01/03, TEST-01/02, TOOL-03.
3. Não misturar com SECURITY/PRIVACY/PERFORMANCE — eixos distintos.
