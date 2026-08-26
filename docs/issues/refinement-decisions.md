## Decisões de refinamento (chat)

### Mobile / sidebar

- No mobile, menu vira **drawer/overlay** fechado por padrão.
- Trigger: **hamburger no canto superior da área de conteúdo**.

### Persistência

- Tema e idioma persistem em **cookies** (não localStorage).
- Manager: **`CookiesManager`** com `get`/`set` (não LocalStorageManager).
- Sem cookie de tema → `prefers-color-scheme` do SO.
- Locale default sem cookie → **pt**.

### /config

- Usa o **mesmo shell**; sidebar é **um único componente compartilhado** por todas as páginas.

### i18n

- **next-intl** com prefixo **sempre**: `/pt`, `/en`, `/es`.
- Catálogos em `src/constants/texts` (ou equivalente).

### shadcn

- Estilo **new-york**, tokens CSS alinhados às paletas.

### Ícones

- **lucide-react**.

### Fatia de trabalho

- Issues em camadas: foundation → design-system + i18n (paralelo) → layout → settings.

### Labels criadas

- `foundation`, `design-system`, `layout`, `settings`, `i18n` (+ `enhancement` onde couber).
