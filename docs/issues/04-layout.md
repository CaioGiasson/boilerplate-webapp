## Contexto

Estrutura básica da página: menu lateral + área de conteúdo. A sidebar é **um único componente compartilhado** — nenhuma página implementa sidebar própria.

## Objetivo

Implementar `AppShell` + `Sidebar` reutilizáveis, com comportamento desktop e mobile definidos no refinamento.

## Escopo

### Desktop / tablet largo

- Menu lateral **à esquerda**, **sempre colapsado** (somente ícones; sem expandir para labels).
- Topo: logo com a letra **V** com link para `/` (respeitando prefixo de locale, ex. `/pt`).
- Abaixo da logo: ícone **Home** → `/` (mesmo destino).
- Outros itens de menu virão depois — arquitetar lista/config de items extensível.
- Rodapé da sidebar (ainda dentro do rail): ícone **Configurações** → `/config` (com locale).
- Cada item: tooltip no hover com o nome do menu (usar DS + textos i18n).

### Mobile

- Sidebar **não** fica fixa ocupando conteúdo: vira **drawer/overlay**, fechado por padrão.
- Trigger: **botão hamburger** no canto superior da área de conteúdo.
- Itens/tooltips/links iguais ao desktop.

### Conteúdo

- Área de conteúdo renderiza children; a home continua sendo Hello World (já com DS/tokens/i18n).

### Componentização

- `AppShell`, `Sidebar`, `SidebarItem`, trigger mobile, etc. em módulos reutilizáveis (preferir `src/design-system` + composição em `src/components` ou `src/layouts` se fizer sentido).
- Ícones: lucide-react.

## Fora de escopo

- Página de settings (só o link).
- Novos itens de menu além de Home e Configurações.
- Backend.

## Critérios de aceite

- [ ] Todas as páginas usam o mesmo shell/sidebar compartilhado (incluindo `/config` quando existir).
- [ ] Desktop: rail colapsado permanente com logo V, Home, Settings + tooltips.
- [ ] Mobile: drawer overlay aberto via hamburger no topo do conteúdo.
- [ ] Links respeitam locale prefix (`/pt`, `/en`, `/es`).
- [ ] Responsivo mobile / tablet / desktop até Full HD.
- [ ] Nenhuma página duplica markup da sidebar.

## Dependências

Bloqueada por: **design-system** e **i18n** (tooltips/labels e rotas localizadas).

## Notas para o agente

Lista de nav items deve ser data-driven para facilitar novos ícones futuros.
