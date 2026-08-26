## Contexto

Com a foundation (tokens/shadcn) pronta, expor uma biblioteca interna de componentes modulares e reaproveitáveis.

## Objetivo

Criar componentes em `src/design-system` que encapsulam primitives da **shadcn/ui** (nunca reinventar do zero quando existir equivalente).

## Escopo (mínimo obrigatório)

Cada item abaixo deve ser um módulo individual, importável:

| Componente                     | Uso                              | Base shadcn sugerida          |
| ------------------------------ | -------------------------------- | ----------------------------- |
| `Icon` / wrappers de ícone     | Ícones do menu (lucide-react)    | —                             |
| `IconButton` / `NavIconButton` | Item clicável só com ícone       | `Button` (variant ghost/icon) |
| `Tooltip`                      | Label ao hover dos itens do menu | `Tooltip`                     |
| `Button`                       | Ações gerais                     | `Button`                      |
| `Switch` (toggler)             | Ativar tema escuro               | `Switch`                      |
| `Select`                       | Idioma                           | `Select`                      |
| `Title` / tipografia           | Títulos de página/seção          | tokens + tipografia           |
| `SettingsSection`              | Seção "Geral" em /config         | layout local do DS            |
| Outros identificados           | Separar se forem reutilizáveis   | preferir shadcn               |

Ícones: **lucide-react** (padrão shadcn).

## Regras

- Preferir importar/compor shadcn em vez de markup custom.
- Visual deve respeitar tokens/globals da foundation (overrides globais mandam).
- Compatível com mobile / tablet / desktop (Full HD).
- Exportar via barrel `src/design-system/index.ts` (ou equivalente organizado).

## Fora de escopo

- Implementar o AppShell/sidebar completo (issue de layout).
- Página `/config` completa (issue de settings).
- Wiring next-intl (issue de i18n) — componentes podem aceitar `string` props; textos virão dos catalogs depois.

## Critérios de aceite

- [ ] Pasta `src/design-system` com os módulos acima.
- [ ] Todos os componentes listados tipados e usáveis em página demo mínima **ou** no Hello World.
- [ ] Tooltip, Switch e Select funcionam acessivelmente (keyboard + ARIA do Radix/shadcn).
- [ ] Sem CSS inline de paleta hardcoded — usar tokens.
- [ ] Build e lint ok.

## Dependências

Bloqueada por: **foundation** (tokens, shadcn, Geist).

## Notas para o agente

Manter componentes finos; não colocar lógica de cookie/rota dentro do DS — só UI.
