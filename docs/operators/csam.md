# Canal de denúncia / CSAM (PRIV-C06)

## O que existe no produto

- Usuários autenticados podem denunciar uma imagem via `POST /api/v1/images/:id/report` e pela UI no detalhe da imagem (botão “Reportar”, oculto para o dono).
- Cada denúncia vira um registro `Report` (motivo, detalhes opcionais, status `open`/`reviewing`/`closed`).
- Motivos incluem `csam` (material de abuso sexual infantil) e outros (spam, nudes não consentidos, impersonação, outro).

## O que **não** está neste repositório

- Notificação automática a NCMEC, SaferNet, polícia ou similares.
- Hash perceptual / PhotoDNA / moderação automática.
- Playbook operacional detalhado de preservação de evidências.

Processos legais e de resposta a CSAM são **obrigação humana/operacional fora do código**. O canal e o registro persistem para a fila humana; o operador deve seguir a lei aplicável.

## Logs

Não logar `details` da denúncia nem dados de nascimento. No máximo `reportId` + `imageId`.
