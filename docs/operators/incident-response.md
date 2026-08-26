# Playbook de resposta a incidentes de dados (PRIV-I08)

Modelo operacional interno alinhado à LGPD art. 48 (comunicação à ANPD e aos titulares) e boas práticas GDPR (notificação à autoridade / titulares quando houver alto risco). **Não é parecer jurídico.** Prazos e gatilhos devem ser validados com o encarregado e, se necessário, com assessoria legal.

## Papéis

| Papel                                  | Responsabilidade                                                                 | Contato                                         |
| -------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Encarregado / ponto de privacidade** | Avaliar risco aos titulares; decidir notificação ANPD/titulares; manter registro | **Caio Felipe Giasson** — `cainitech@gmail.com` |
| **Ops / engenharia**                   | Detectar, conter, erradicar, recuperar; preservar evidências técnicas            | Canal interno TBD                               |
| **Produto / controlador**              | Decisões de produto, comunicação pública, aprovação de downtime                  | Caio Felipe Giasson / App                       |

## Fluxo resumido

1. **Detectar** — alerta de segurança, denúncia, anomalia em logs, vazamento acidental, ticket.
2. **Registrar** — abrir entrada no registro de incidentes (abaixo) com data/hora UTC, descoberta vs. ocorrência.
3. **Conter** — revogar credenciais, rotacionar segredos (`JWT_SECRET`, Spaces keys), invalidar sessões (`sessionsRevokedAt`), isolar bucket/host, desativar endpoint se necessário.
4. **Avaliar** — categorias de dados, volume estimado, titulares afetados, probabilidade de dano (ex.: fotos privadas), medidas já em vigor (bucket privado, URLs assinadas).
5. **Comunicar** — se risco relevante aos titulares: ANPD em prazo razoável e titulares quando a lei exigir; usar o template abaixo.
6. **Erradicar / recuperar** — corrigir causa raiz; validar que objetos/contas não permanecem expostos.
7. **Lições aprendidas** — atualizar este playbook, DPIA (`dpia-images.md`) e SECURITY-REPORT.

## Registro mínimo de incidente

| Campo                     | Exemplo                                   |
| ------------------------- | ----------------------------------------- |
| ID interno                | INC-YYYYMMDD-001                          |
| Descoberta (UTC)          |                                           |
| Ocorrência estimada (UTC) |                                           |
| Sistemas                  | Spaces / Mongo / app / host               |
| Dados envolvidos          | ex.: imagens PRIVATE; e-mails             |
| Titulares estimados       | N / desconhecido                          |
| Contenção aplicada        |                                           |
| Notificação ANPD?         | sim / não / sob avaliação                 |
| Notificação titulares?    | sim / não / sob avaliação                 |
| Encarregado responsável   | Caio Felipe Giasson — cainitech@gmail.com |

## Template — notificação à ANPD (rascunho)

> **Assunto:** Comunicação de incidente de segurança — App  
> **Remetente:** Encarregado / contato de privacidade — Caio Felipe Giasson \<cainitech@gmail.com\>  
> **Controlador:** App (operado por Caio Felipe Giasson)
>
> 1. **Natureza do incidente:** (ex.: acesso não autorizado a objetos de armazenamento; exposição de URLs; comprometimento de credencial de Spaces/Mongo.)
> 2. **Data/hora da descoberta e da ocorrência estimada (UTC).**
> 3. **Dados pessoais afetados:** categorias (conta, imagens, metadados), sensibilidade (conteúdo potencialmente íntimo), volume aproximado.
> 4. **Titulares:** número estimado; critérios de identificação.
> 5. **Consequências possíveis:** (ex.: divulgação de fotos privadas; usurpação de conta.)
> 6. **Medidas de contenção e remediação já adotadas.**
> 7. **Medidas para mitigar efeitos aos titulares.**
> 8. **Contato do encarregado:** Caio Felipe Giasson — cainitech@gmail.com.
> 9. **Outras autoridades / comunicações** (se aplicável).
>
> Anexos: linha do tempo, IDs técnicos sem PII desnecessária, evidências preservadas.

## Comunicação aos titulares (quando couber)

Linguagem clara; o quê aconteceu; quais dados; o que o titular pode fazer (trocar senha, revisar sessões, contatar cainitech@gmail.com); o que o controlador já fez. Evitar detalhes que ajudem abuso.

## Cenário de referência — vazamento em massa de fotos

Ver DPIA em `docs/operators/dpia-images.md`. Controles atuais: bucket privado, URLs assinadas, paths com `ownerId`. Em incidente: rotacionar chaves Spaces, auditar ACL/`ListObjects`, revogar sessões, avaliar notificação obrigatória.

## Limitações documentadas

- Encarregado **nomeado como pessoa** ainda pendente — só e-mail placeholder.
- Sem ferramenta formal de ticket de incidente no repo — usar este registro + issue privada se necessário.
- Prazos legais exatos e gatilho de “risco relevante” exigem validação humana / jurídica.
