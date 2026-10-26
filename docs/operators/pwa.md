# PWA (instalação, offline e atualização)

Decisão: [ADR-014](../adr/014-pwa-service-worker.md).

## O que existe

| Peça                  | Arquivo                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Manifest              | `src/app/manifest.ts` + `src/lib/pwa/webManifest.ts` (servido em `/manifest.webmanifest`)          |
| Ícones                | `public/pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`, `apple-touch-icon.png` (placeholders) |
| Service worker        | `public/sw.js`                                                                                     |
| Páginas estáticas     | `public/offline.html`, `public/error.html`                                                         |
| Registro              | `ServiceWorkerRegistrar` (só em produção)                                                          |
| Atualização forçada   | `ForceAppUpdate` + `GET /api/v1/version`                                                           |
| Convite de instalação | `PwaInstallBanner` (só logado; iOS recebe o passo a passo)                                         |

## Trocar os ícones

Sobrescreva os quatro PNGs de `public/` com a arte da marca (192×192, 512×512, 512×512 _maskable_ com a arte dentro da zona segura de ~70 %, 180×180). `npm run pwa:icons` regenera os placeholders (inicial de `APP_NAME` sobre fundo escuro). Ajuste `PWA_THEME_COLOR`/`PWA_BACKGROUND_COLOR` em `src/lib/pwa/webManifest.ts`.

## Publicar uma versão e forçar a atualização

1. Altere `version` em `package.json`.
2. Faça o deploy. Os clientes abertos detectam a diferença em até 5 min (ou ao voltar para a aba), mostram "Nova versão disponível" e recarregam depois de 1,8 s — a menos que haja um campo em foco; nesse caso tentam no check seguinte.
3. Mudou o `public/sw.js`? Suba também `SW_VERSION` (comentário no topo do arquivo) e, se renomeou caches, o prefixo/nome em `CURRENT_CACHES`: o `activate` apaga os caches `app-*` que não estiverem na lista.

Deploy **sem** bump de versão não recarrega ninguém.

## Depurar o service worker

- DevTools → Application → Service Workers: "Update on reload", "Unregister".
- Em desenvolvimento ele não é registrado (e um SW herdado é desregistrado). Para testar: `npm run build && npm run start` e abra em `http://localhost:3000` (o SW não intercepta chunks em `localhost`; para exercitar o cache use um host real/HTTPS).
- Limpar tudo no navegador de um usuário: DevTools → Application → Storage → Clear site data.

## Rollback de um SW com problema

1. Corrija `public/sw.js` (ou deixe-o só com os listeners `install`/`activate` limpando caches).
2. Suba `SW_VERSION` e a versão do app e faça o deploy. `/sw.js` nunca é cacheado pelo navegador, então a correção chega na próxima carga.

## Privacidade

O SW não guarda HTML nem `/api`. Só entram no cache `/_next/static`, ícones, imagens e fontes da mesma origem, e as páginas `offline.html`, `error.html`, `theme.js`, `error-guard.js`. Se um dia precisar cachear páginas, defina a política por rota e limpe os caches no logout antes (ver ADR-014).
