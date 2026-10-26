# Contexto do produto — Boilerplate Webapp

Fatos do produto para agentes de IA. **Leia o arquivo da área antes de refinar uma issue** e **atualize-o na mesma entrega** (regra em [`AGENTS.md`](AGENTS.md#contexto-do-produto-context)). Este arquivo diz **o que o app é e faz hoje**; o **processo** está em `AGENTS.md` e as **decisões** em `docs/adr/`.

| Arquivo                                              | Assunto                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`CONTEXT.md`](CONTEXT.md)                           | Este arquivo: papéis, conta, sessão, settings, integrações opcionais, o que está em aberto |
| [`CONTEXT-ARCHITECTURE.md`](CONTEXT-ARCHITECTURE.md) | Camadas, transações, bibliotecas, rotas, env, upload, IA, PWA, push                        |
| [`CONTEXT-CODE.md`](CONTEXT-CODE.md)                 | Inventário: use cases, repositories, services, managers, controllers, scripts              |
| [`CONTEXT-ENTITIES.md`](CONTEXT-ENTITIES.md)         | Models Prisma, relações e invariantes de persistência                                      |
| [`CONTEXT-DS.md`](CONTEXT-DS.md)                     | Design system: componentes, props e catálogo `/ds-components`                              |

Contrato HTTP campo a campo: [`docs/openapi.yaml`](docs/openapi.yaml) e `requests/`. Diagrama de camadas: [`docs/architecture.md`](docs/architecture.md). Glossário: [`docs/glossary.md`](docs/glossary.md). Operação: `docs/operators/`.

Snapshot: **2026-10-26**. Versão do app (`package.json`, `GET /api/v1/version`, atualização forçada do PWA): **0.1.0**.

## O que o produto é

Um **starter** Next.js 15 (App Router) com autenticação completa, perfil, configurações, armazenamento de imagens, e-mail transacional, design system e arquitetura em camadas — **sem regras de negócio de um domínio específico**. Quem o usa acrescenta o domínio por cima. Idiomas: pt, en, es (`next-intl`).

## Papéis

- **Visitante** — sem sessão: landing, cadastro, login, recuperação de senha, termos/privacidade.
- **Usuário (`User.role = USER`)** — conta ativa. Conta anterior ao campo `role` (ausente) conta como `USER`.
- **Admin (`User.role = ADMIN`)** — acessa `/admin` (lista de usuários com e-mail mascarado) e gera link de acesso (impersonamento) para um usuário comum. **Única forma de criar admin:** `npm run change-user-role -- <email> ADMIN` (`--confirm` em produção). Não pode impersonar a si mesmo nem outro admin. Detalhes: [ADR-013](docs/adr/013-admin-role-and-impersonation.md), [`docs/operators/admin.md`](docs/operators/admin.md).

## Conta

- **Cadastro:** nickname, e-mail, senha, data de nascimento, aceite de termos e privacidade. Idade mínima conforme `ageGate.ts` (UTC); data guardada em `User.dateOfBirth` e **não** exposta no DTO público.
- **Senha:** 8–128 caracteres e ao menos 3 entre minúscula, maiúscula, dígito e símbolo (`passwordPolicy.ts`). Hash `argon2`. Operador: `npm run change-user-password`.
- **Nickname:** normalizado e único (`canonicalizeNickname`/`normalizeNickname`, `utils/nickname.ts`).
- **E-mail:** desafios `verify`, `change_old`, `change_new` e `password_reset` (código de 8 caracteres, TTL de 1 h, guardado como SHA-256). O DTO expõe `emailChallenge: none | verify | change_old | change_new`.
- **Google OAuth (opcional):** Authorization Code; vínculo por e-mail; `pending_link` exige a senha (ADR-010). Só aparece com `GOOGLE_OAUTH_*` completos.
- **Sessão:** JWT em cookie `HttpOnly` (`app-session`, `__Host-app-session` em HTTPS), TTL padrão 7 dias, `jti` registrado em `ActiveSession`; logout/revogação grava `SessionEvent`. Trocar senha ou "sair de todos" grava `User.sessionsRevokedAt` e derruba as sessões emitidas antes. Dispositivos listados no perfil; novo dispositivo dispara e-mail de aviso. ADR-001.
- **Sessão de impersonamento:** 10 minutos, sem renovação, nunca vira `ActiveSession`; rotas destrutivas/de conta respondem 403 (`assertNotImpersonation`). Faixa vermelha no topo com o alvo e o tempo restante.
- **Exclusão de conta:** quarentena de **30 dias** (`ACCOUNT_DELETION_QUARANTINE_DAYS`), com cancelar/manter ao entrar; depois o `retention-purge` anonimiza e apaga os objetos. [`docs/operators/account-deletion.md`](docs/operators/account-deletion.md).
- **Exportação LGPD:** `GET /api/v1/users/me/export` devolve perfil público, arquivos, notificações, **contagem/data** dos aparelhos de push (nunca endpoint ou chaves) e as chamadas de IA do titular.

## Settings do usuário

Aceitas em `PATCH /api/v1/users/{id}/settings`, **uma chave por vez**: `darkMode` (boolean) e `language` (`pt` | `en` | `es`). Tema e idioma também ficam em cookies (`app-theme`, `app-locale`). Chave nova entra em `Settings.manager.ts` com validação.

## Armazenamento e cota

Bucket DigitalOcean Spaces **privado**; leitura por URL assinada (ADR-002). Toda imagem passa pelo `SharpImageProcessor`: WebP, avatar quadrado de 512 px, galeria até 1600 px, **thumbnail de 200 px**; recusa SVG e imagens com mais de 40 milhões de pixels. Cota por usuário: **1 GiB** de `File.sizeBytes` (principal + thumbnail) com `status = published`. Foto de perfil: recorte no cliente (`ImageCropModal`) e envio de até 3 MB. [`docs/operators/images.md`](docs/operators/images.md).

## Integrações opcionais (todas desligadas por padrão)

| Recurso          | Como liga                                                                         | Sem ele                                    |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| E-mail (Brevo)   | `EMAIL_PROVIDER=brevo` + `BREVO_API_KEY` + `EMAIL_FROM` (obrigatório em produção) | `none`/`disabled` só fora de produção      |
| Login com Google | `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI`                                      | O botão "Continuar com Google" não aparece |
| IA (AI Service)  | `AI_PROVIDER=openai` + `OPENAI_API_KEY` **e** a feature flag `ai_enabled`         | `503`; não há rota HTTP de IA (use cases)  |
| Web Push         | `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` (as três)              | Só o sino in-app; toggle explica o motivo  |
| Swagger UI       | `SWAGGER_ENABLED=true` + `SWAGGER_USER`/`SWAGGER_PASSWORD`                        | `/api/docs` responde 404                   |

Feature flags (`ai_enabled`): coleção append-only, valor vigente = registro mais recente, cache de 30 s por instância. `npm run toggle-feature-flag -- <key>`. ADR-011.

## Notificações e PWA

Sino in-app (`/notifications`, badge por polling de 60 s) e Web Push por aparelho. Outros use cases notificam por `CreateNotification` **depois do commit**. O app é instalável (manifest, ícones de placeholder, `sw.js`); o service worker **não guarda HTML nem `/api`**; offline cai em `/offline.html` e 5xx em `/error.html`. Mudança de `version` no `package.json` recarrega os clientes abertos (adiada enquanto há campo em foco). ADR-014 e ADR-015.

## O que exige rede

Tudo que fala com a API. Não há modo offline de dados. Sem rede o app mostra `/offline.html` em novas navegações; assets já guardados continuam servidos.

## O que está em aberto

Itens avaliados e **não** implementados — não implementar por inferência: [`docs/issues/porte-tribal-backlog.md`](docs/issues/porte-tribal-backlog.md) (níveis/cotas de plano, `UserRequest`, offline-first, realtime, páginas de produto, scripts de deploy/restore). Pendências do `ROADMAP.md` são do projeto de origem. Limitações aceitas de escala (o boilerplate **não** prevê N réplicas): [`docs/known-issues/scalability.md`](docs/known-issues/scalability.md).

## Como manter estes arquivos

Na mesma entrega de qualquer evolução, atualize **o arquivo da área** e a data do snapshot:

1. Regra de negócio, papel, conta, settings, integração opcional → `CONTEXT.md`.
2. Camada, biblioteca, upload, rota, env, PWA/push/IA → `CONTEXT-ARCHITECTURE.md`.
3. Repository, método público, service, manager, use case, controller ou script novo → `CONTEXT-CODE.md`.
4. Model ou invariante de persistência → `CONTEXT-ENTITIES.md` (campo novo se documenta no `///` do model, sem copiar o schema).
5. Componente, prop ou detalhe visual → `CONTEXT-DS.md`.
6. Rota nova ou alterada também atualiza `docs/openapi.yaml` e `requests/`.
