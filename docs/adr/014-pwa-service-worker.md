# ADR-014 — PWA: service worker sem cache de páginas e atualização forçada

- **Status:** Aceito
- **Data:** 2026-10-26

## Contexto

O app deve ser instalável (manifest, ícones, service worker) e não pode ficar preso em uma versão antiga do bundle. O service worker do `tribalRPGBot` também cacheia documentos HTML para uso offline; em máquina compartilhada isso deixaria páginas autenticadas acessíveis depois do logout.

## Decisão

- **O service worker nunca guarda HTML nem respostas de `/api`.** Só guarda o que é público e imutável: `/_next/static/**` (cache-first), ícones/imagens/fontes da mesma origem (stale-while-revalidate) e as páginas de fallback estáticas. Não há cache de dado pessoal, então o logout não precisa limpar nada.
- **Offline e erro:** navegação sem rede cai em `/offline.html`; resposta 5xx cai em `/error.html`. As duas são páginas estáticas, em três idiomas, sem dependência do Next. (`/error.html` é a mesma do ADR do tratamento de erro.)
- **Não intercepta em desenvolvimento:** `localhost` não usa o cache de chunks, e o registrador só registra o SW em produção — fora dela, desregistra um SW herdado.
- **Atualização forçada:** `ForceAppUpdate` consulta `GET /api/v1/version` a cada 5 min e ao voltar para a aba. Versão do servidor diferente da do bundle (`APP_VERSION`, lida do `package.json`) → aviso e `SKIP_WAITING` + reload após 1,8 s. O reload é **adiado enquanto há um campo em foco**, para não perder o que está sendo digitado (melhoria sobre o tribal).
- **A versão só muda quando alguém altera `version` no `package.json`.** Deploy sem bump não recarrega os clientes; bump recarrega todos os que estiverem abertos.
- **Manifest** gerado por `src/app/manifest.ts`; ícones de placeholder (`npm run pwa:icons`) a serem trocados pela marca do produto.
- **Push:** os handlers `push` e `notificationclick` do `sw.js` pertencem ao ADR-015 (notificações); eles não guardam nada em cache.
- `/sw.js` é servido com `Cache-Control: no-cache, no-store, must-revalidate`: um SW com bug nunca fica preso no navegador.

## Consequências

### Positivas

- Instalável e com experiência de erro/offline decente sem risco de vazamento entre usuários no mesmo navegador.
- Rollback simples: corrigir o `sw.js`, subir `SW_VERSION` e a versão do app.

### Negativas / trade-offs

- **Sem navegação offline de páginas já visitadas** (o tribal tem, ao custo do cache de HTML). Offline-first completo é um item de backlog (`docs/issues/porte-tribal-backlog.md`, item 9) e exigiria uma política de cache por rota com limpeza no logout.
- Todo bump de versão recarrega os clientes abertos.
- iOS não oferece `beforeinstallprompt`: o banner mostra o passo a passo manual.

## Referências

- `public/sw.js`, `public/offline.html`, `src/components/pwa/*`, `src/lib/pwa/*`, `src/app/manifest.ts`
- `docs/operators/pwa.md`
