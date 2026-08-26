# Planejamento: Autenticação, conta de usuário e perfil

> Gerado em 2026-08-11. Revise e confirme antes da criação da issue no board GitHub.

## Objetivo

Permitir que o usuário se cadastre, entre e saia da conta no Vitraux; gerenciar perfil (nome, nickname, senha e foto); sincronizar preferências de interface na nuvem quando autenticado; e expor na Sidebar um menu de conta com estados guest/autenticado.

## Regras de negócio

1. **Menu da Sidebar (footer):** o item deixa de ser link direto de Configurações com ícone Settings. Passa a ser um trigger de menu (DropdownMenu do design-system).
2. **Guest (não autenticado):** ícone de usuário (lucide `User`). Itens do menu: **Entrar**, **Cadastrar**, **Configurações**.
3. **Autenticado:** ícone = foto do usuário (`photoUrl`) quando disponível; senão ícone `User`. Itens: **Perfil**, **Configurações**, **Sair**.
4. **Entrar** → página de login (e-mail + senha).
5. **Cadastrar** → página de cadastro (nickname, e-mail, senha, confirmação de senha). Não coleta `name` no cadastro.
6. **Perfil** → página para editar nome completo, nickname, trocar senha (com senha atual) e foto.
7. **Configurações** → `/config` continua acessível sem autenticação.
8. **Sair** → invalida a sessão (grava evento `LOGOUT` em `SessionEvents`), limpa cookie de sessão e redireciona para `/` (home, com locale).
9. **Auth:** JWT assinado com `jose`, armazenado em cookie **httpOnly + Secure + SameSite=Lax** via `cookies()` do Next.js. TTL **7 dias**. Claims mínimos: `userId`, `device`, `iat`, `exp` (e o próprio token rastreável para SessionEvents).
10. **Device:** UUID gerado no client na primeira visita, persistido localmente e enviado no login/cadastro; embutido no JWT e em `SessionEvents.device`.
11. **Middleware de rotas protegidas:** valida assinatura/expiração do JWT; confere que o token **não** consta em `SessionEvents` (logout/revogação); em rotas com `:id` de usuário, o `userId` da rota deve ser igual ao da token.
12. **SessionEvents:** collection com `token`, `occurredAt`, `event` (`LOGOUT` | `FORCED_LOGOUT` | `REVOKE`), `device`. Nesta issue só se emite `LOGOUT`; demais valores existem apenas no enum.
13. **Senha:** mínimo 8 caracteres e cumprir **ao menos 3** de: minúsculas, maiúsculas, números, símbolos. Hash com **argon2id**. Nunca retornar hash em APIs.
14. **Confirmação no cadastro:** dois campos de senha; o segundo deve bloquear autofill/autocomplete (forçar digitação). Não há verificação por e-mail/código.
15. **Nickname:** único (case-sensitive conforme stored value; índice unique no Mongo). Cadastro e edição em Perfil validam disponibilidade. `GET /api/v1/nickname/[nickname]` → **200** se existe, **404** se não existe (sem body sensível).
16. **Name:** `null` até preenchido em Perfil; editável depois.
17. **E-mail:** único; usado no login.
18. **Foto:** upload para DigitalOcean Spaces (padrão tribalRPGBot: `StorageService` + orquestração tipo `FileManager`); domínio guarda só URL. Max **3MB**. MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Rota protegida `PATCH /api/v1/users/:id/photo`.
19. **Settings (guest):** `/config` persiste tema/idioma em cookies locais (`CookiesManager`) — comportamento atual.
20. **Settings (auth):** persistidos em `User.settings` como array de `{ key, value }` (reutilizar type `KeyValueObject` do Prisma). No **login bem-sucedido**, ler settings da nuvem e **sobrescrever** cookies locais (nuvem vence).
21. **SettingsManager:** API `get(user, key)`, `set(user, key, value)`, `list(user)`. Garante **no máximo um objeto por key** no array; essa regra fica encapsulada no manager.
22. **Redirect pós login/cadastro:** home (`/`).
23. **Recuperação de senha:** fora de escopo.
24. **Componentes DS obrigatórios nesta feature:** DropdownMenu (menu list), Avatar, Toast (sucesso/falha), InputPassword, FileInput — e quaisquer outros claramente modularizáveis extraídos para `src/design-system`.
25. **Arquitetura:** camadas do Vitraux alinhadas a `boilerplate-backend` / `ai-toolbox` (controller → useCase → service/repository; Prisma só em repositories; erros tipados; Zod no controller).

## Critérios de aceite

- [ ] Model `User` no MongoDB via Prisma (inclui `settings` KeyValue[], `photoUrl` opcional, `name` opcional, `nickname` unique, `email` unique, `passwordHash`).
- [ ] Model `SessionEvents` com enum de eventos e campos acordados.
- [ ] Cadastro cria usuário (nickname + e-mail + senha), cria sessão JWT em cookie httpOnly, redireciona para home.
- [ ] Login autentica e-mail/senha, aplica settings da nuvem sobre cookies locais, redireciona para home.
- [ ] Logout grava `SessionEvents` (`LOGOUT`), limpa cookie, redireciona para home; token não pode mais acessar rotas protegidas.
- [ ] `GET /api/v1/nickname/[nickname]` retorna 200 se nick existe e 404 se não.
- [ ] Páginas Login, Cadastro e Perfil (localizadas pt/en/es) funcionais.
- [ ] Sidebar: menu guest vs autenticado conforme regras; avatar quando houver `photoUrl`.
- [ ] Perfil: editar name, nickname (com validação de unicidade), trocar senha (exige senha atual), upload de foto ≤3MB (jpeg/png/webp/gif).
- [ ] Rotas de mutação de usuário/foto protegidas pelo middleware de sessão (token válida, não revogada, `:id` = userId da token).
- [ ] `/config` permanece pública; guest usa cookies; usuário logado persiste via `SettingsManager` em `User.settings`.
- [ ] `SettingsManager` encapsula unicidade de keys no array.
- [ ] Toast sucesso/falha, InputPassword e FileInput no design-system e usados nas telas.
- [ ] Upload espelha tribalRPGBot (Spaces externo, URL no User).
- [ ] Textos i18n das novas telas/menus nos catálogos.
- [ ] Testes cobrindo use cases críticos (register, login, logout/revogação, nickname check, settings upsert, password rules).

## Fluxo principal

### Cadastro

1. Usuário abre menu → Cadastrar.
2. Preenche nickname, e-mail, senha e confirmação (2º campo sem autofill).
3. Front pode consultar `GET /nickname/[nickname]` para feedback antecipado.
4. `POST` register valida regras, hash argon2id, cria User (`name: null`), emite JWT com device, seta cookie, redireciona home.

### Login

1. Menu → Entrar → e-mail + senha.
2. Valida credenciais; emite JWT; seta cookie.
3. `list(user)` settings → sobrescreve cookies locais (tema/idioma).
4. Redireciona home; Sidebar passa a estado autenticado.

### Perfil

1. Menu → Perfil.
2. Edita name / nickname / senha / foto.
3. APIs protegidas atualizam User; foto sobe para Spaces e `photoUrl` é atualizado.
4. Toasts de sucesso/falha.

### Logout

1. Menu → Sair.
2. Persiste SessionEvent `LOGOUT` com token + device + datetime.
3. Limpa cookie; redirect home; menu volta a guest.

## Edge cases

- Nickname ou e-mail já existentes no cadastro/edição → 409 (ou equivalente ClientError), toast de falha.
- Race de nickname: unique index + tratamento de erro Prisma.
- Senha fraca / confirmação diferente → 400 com mensagem clara.
- Login com credenciais inválidas → 401 genérico (não revelar se e-mail existe).
- Token expirada ou presente em SessionEvents → 401 em rotas protegidas.
- Tentativa de `PATCH /users/:outroId/...` com token de outro user → 403.
- Foto > 3MB ou MIME inválido → 400; não sobe para Spaces.
- Falha no Spaces → erro de infra; User não fica com URL quebrada inconsistente (falha antes de persistir URL nova; política de orphan opcional alinhada ao tribalRPGBot se houver File tracking).
- Autofill agressivo no 2º campo de senha/e-mail → atributos `autocomplete` adequados (`new-password`, etc.) e medidas anti-autofill no campo de confirmação.
- Usuário autenticado altera tema/idioma em `/config` → `SettingsManager.set` + cookie local atualizado.
- Guest em `/config` → somente cookies (sem User).
- Sem `photoUrl` → ícone User no trigger do menu.
- Device UUID ausente no login → gerar/persistir antes de autenticar.

## Repositórios afetados

### vitraux

- **O que muda:** feature full-stack de auth, perfil, settings em nuvem, upload de avatar, UI Sidebar + 3 páginas + componentes DS.
- **Módulos/endpoints afetados:**
    - Prisma: `User`, `SessionEvents` (+ opcional `File` para tracking de upload); type `KeyValueObject` já existente.
    - Managers: `SettingsManager`; auth/session helpers; possível extensão de cookies/device.
    - Middleware: auth de rotas protegidas + integração com next-intl.
    - Use cases: register, login, logout, getNicknameAvailability, updateProfile, changePassword, uploadUserPhoto, sync/apply settings.
    - Services: `StorageService` (Spaces), orquestração de arquivo.
    - Repositories: User, SessionEvents, File (se aplicável).
    - APIs: register, login, logout, `GET /api/v1/nickname/[nickname]`, GET/PATCH user profile, `PATCH /api/v1/users/:id/photo`, endpoints de settings se expostos.
    - UI: `Sidebar`, páginas `[locale]/login`, `[locale]/register` (ou `/cadastrar`), `[locale]/profile` (ou `/perfil`), `/config` wiring para SettingsManager quando logado.
    - DS: DropdownMenu, Avatar, Toast, InputPassword, FileInput.
    - i18n: catálogos pt/en/es.
    - Env: `JWT_SECRET`, `SPACES_*`, etc. em `.env.example` + `validateEnv`.
- **Dependências:** nenhuma de outro repositório de código; padrões de `ai-toolbox` / `boilerplate-backend`; mecânica de upload de `tribalRPGBot`.
- **Cuidados técnicos:**
    - Não logar senha, token ou secrets (`API_AND_SECURITY.md`).
    - Prisma somente em repositories.
    - Validação Zod no controller + regras no use case.
    - `jose` no Edge middleware (não `jsonwebtoken`).
    - Sidebar já é componente compartilhado — evoluir, não duplicar.
    - Manter `/config` pública.

### ai-toolbox / boilerplate-backend / tribalRPGBot

- **O que muda:** nada (somente referência de padrões).

## Dependências entre repositórios

Ordem interna sugerida na mesma issue (vitraux):

1. Prisma models + env Spaces/JWT
2. SettingsManager + SessionEvents/auth middleware
3. APIs auth/perfil/nickname/photo
4. Design-system (Toast, InputPassword, FileInput, DropdownMenu, Avatar)
5. Páginas Login / Cadastro / Perfil
6. Sidebar menu + sync settings no login
7. Testes + i18n

## Informações consolidadas (decisões)

| Tema                 | Decisão                                                  |
| -------------------- | -------------------------------------------------------- |
| Auth                 | JWT `jose` + cookie httpOnly Secure SameSite=Lax; TTL 7d |
| Hash                 | argon2id                                                 |
| Device               | UUID client-side persistido                              |
| name no cadastro     | `null` até Perfil                                        |
| SessionEvents        | enum completo; só emite `LOGOUT` agora                   |
| Foto MIME            | jpeg, png, webp, gif; max 3MB                            |
| Storage              | DigitalOcean Spaces                                      |
| Label GitHub         | `feature`                                                |
| Fatiamento           | **uma única issue** detalhada                            |
| Recuperação de senha | fora de escopo                                           |
