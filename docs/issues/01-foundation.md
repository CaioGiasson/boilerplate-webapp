## Contexto

Primeira entrega da estrutura visual do Vitraux. Define a base de estilo, fonte, paletas claro/escuro, shadcn/ui e persistência de preferências via cookies (não localStorage).

## Objetivo

Criar a fundação de design e infraestrutura de cookies para tema/locale, de forma que as próximas issues (design-system, layout, settings, i18n) consumam tokens e managers padronizados.

## Escopo

- Inicializar **shadcn/ui** (estilo **new-york**) no projeto Next.js 15 App Router.
- Mapear tokens CSS (CSS variables) para as paletas:

### Modo claro

- Primária (Azul Royal): `#2563EB`
- Destaque (Mostarda Suave): `#DDA15E`
- Fundo (Cinza Gelo): `#F8FAFC`
- Texto (Azul Marinho): `#0F172A`

### Modo noturno

- Fundo (Azul Meia-Noite): `#0B1120`
- Superfície (Ardósia Escura): `#1E293B`
- Destaque (Terracota Suave): `#D48C5B`
- Texto (Branco Quebrado): `#F1F5F9`

- Criar **guia de estilos globais** (ex.: `src/app/globals.css` e/ou `src/design-system/styles/globals.css`) cujo CSS **sobrescreve** fontes/cores de quaisquer libs importadas (incluindo shadcn).
- Fonte padrão do sistema: **Geist** (https://fonts.google.com/specimen/Geist), aplicada globalmente e sobrescrevendo qualquer stack anterior (Fraunces/Outfit, etc.).
- Criar `CookiesManager` (ex.: `src/managers/Cookies.manager.ts`) com API simples `get(key)` e `set(key, value)` (e tipagem segura). Preferências de tema e idioma usam cookies — **não** localStorage.
- Tema escuro:
    - Persistência em cookie.
    - Se **não** houver cookie de tema, usar `prefers-color-scheme` do SO.
    - Aplicar classe/atributo compatível com shadcn (ex.: `class="dark"` no `html`).
- Adequar a página Hello World existente para consumir fonte + tokens da paleta (ainda sem shell completo).
- Responsividade: tokens e base tipográfica ok em mobile, tablet e desktop até Full HD.

## Fora de escopo

- Sidebar / AppShell.
- Página `/config`.
- Catálogos completos next-intl (apenas deixar tokens/cookies prontos para a issue de i18n).
- Componentes de UI reutilizáveis finais (isso é a issue de design-system).

## Critérios de aceite

- [ ] shadcn inicializado e build/`tsc` passando.
- [ ] CSS variables das duas paletas disponíveis e `dark` funcional pela classe/cookie/`prefers-color-scheme`.
- [ ] Geist é a fonte efetiva em toda a UI base.
- [ ] `CookiesManager.get/set` implementado e usado para tema.
- [ ] Hello World visual alinhado à paleta/fonte.
- [ ] Estilos globais do guia **vencem** estilos default do shadcn quando conflitarem.

## Dependências

Nenhuma (primeira da sequência).

## Notas para o agente

Seguir camadas e convenções do repo. Código em inglês; docs/comentários em português.
