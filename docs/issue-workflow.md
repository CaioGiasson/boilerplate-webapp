# Fluxo de Issues e Tarefas

Board do projeto: [App — Project board](https://github.com/users/CaioGiasson/projects/3/views/1)

## Gate antes de implementar

Pedidos de implementação — por exemplo **“Faça uma tela que…”**, **“Coloque uma seção de…”**, **“Crie um endpoint que…”**, correção de bug, ajuste de UI ou API — **não** devem gerar código imediatamente.

Ordem obrigatória:

1. **Refinar** o pedido (contexto, objetivo, escopo, critérios de aceite, restrições).
2. **Criar a issue** no board (com label e vínculo ao projeto).
3. **Abrir branch** a partir de `main`, vinculada à issue.
4. **Assignar** quem desenvolve.
5. **Só então** implementar.

## Criação de issues

1. **Toda tarefa nasce no board**  
   Issues sempre são criadas (e acompanhadas) no board acima.

2. **Refinamento prévio obrigatório**  
   Antes de abrir a issue, refine o pedido. O corpo deve conter todas as informações necessárias para o desenvolvimento — contexto, objetivo, escopo, critérios de aceite e restrições — e **não** apenas o prompt inicial do usuário.

3. **Label obrigatória**  
   Ao criar a issue, preencha a label correspondente.  
   Se não houver label adequada:
    - Pergunte no chat qual label deve ser criada.
    - Com a resposta do usuário, crie a label.
    - Só então associe a label à issue.

## Desenvolvimento

1. **Assignee ao iniciar**  
   Ao começar a desenvolver uma issue, assigne o usuário responsável pelo desenvolvimento.

2. **Perguntas e respostas na issue**  
   Todas as perguntas feitas antes ou durante o desenvolvimento, junto com as respostas, devem ser registradas como **comentários na issue**.

3. **Branch da issue**  
   Desenvolver somente na branch vinculada à issue — não commitar feature direto em `main`.

4. **Commit e push obrigatórios**  
   Ao concluir a implementação (ou em marcos lógicos), fazer **commit** (mensagem em pt-BR) e **push** para a branch remota **sem esperar pedido explícito**. Isso garante continuidade em outra máquina se houver problema no computador local.

5. **Pull request**  
   Abrir PR vinculada à issue (`Closes #N` quando couber). Um PR por issue quando possível.

## Escopo e nova issue durante o desenvolvimento

Se o desenvolvedor pedir algo **sem relação com a implementação atual**, o agente deve **criar uma issue específica** e documentar ali a nova solicitação (com refinamento, label e vínculo ao board). Não misturar na issue em andamento.

### Criar nova issue

- Ajuste em estrutura diferente da que está em foco (ex.: trabalhando no topo e pedem ajuste no rodapé).
- Correção de pattern errado descoberto de passagem, sem ser necessário ao objetivo atual.
- Outro bug em outra tela / outro endpoint / outro contexto.
- Extração de componente reutilizável para tela futura, fora do aceite atual.

### Continuar na mesma issue

- Mesma ação transversal no escopo atual (ex.: trocar a fonte no topo e no rodapé da mesma página/tarefa visual).
- Vários ajustes em arquivos diferentes **só porque** o comportamento alvo (ex.: um endpoint) depende deles.
- Trabalho necessário à implementação saudável do objetivo (ex.: índice no banco para filtros do GET em construção).
- Erro de lint/TypeScript pré-existente em arquivo tocado apenas por import/desbloqueio da feature atual.
- Rename cosmético de auxiliar usado só pelo endpoint/feature da issue.
- Mesma correção visual (ex.: spacing) aplicada em outra rota quando o pedido é o mesmo ajuste.
- Melhoria pequena e opcional (ex.: performance) proposta no fluxo da feature, se couber no aceite sem mudar o escopo principal.

### Na dúvida

Se não houver **alto grau de confiança** sobre criar ou não uma nova issue, **consultar o desenvolvedor** antes de seguir.

## Review de PRs

Sempre que uma **pull request for aberta**, o agente deve:

1. Revisar o diff (código, testes, docs, segurança, camadas, i18n quando couber).
2. Corrigir achados **bloqueantes** e **importantes** com commit(s) na branch da PR.
3. Comentar na PR o resultado da review e as **correções pós-review** (ou registrar que não houve correções necessárias).
4. Adicionar a label **`Reviewed`** na PR.

- **Bloqueante:** bug, regressão, falha de segurança, violação de camadas, aceite quebrado, teste crítico ausente, endpoint novo/alterado sem `requests/*.http` + `docs/openapi.yaml`.
- **Importante:** edge case real, inconsistência de API/UI, gap de docs do aceite — corrigir na mesma PR.
- **Opcional / nit:** listar no comentário; não bloqueia merge nem a label.

Se a label `Reviewed` não existir, criá-la no repositório e só então aplicá-la.

Regra Cursor espelhada: `.cursor/rules/pr-review.mdc`.

## Aprovação de tarefa (merge + limpeza)

Quando o usuário **aprova** uma tarefa (ex.: “aprovado”, “pode mergear”, “fecha a task”) e existe PR vinculada:

1. Verificar se a PR tem a label **`Reviewed`**.
2. **Sem** `Reviewed` — **não** mergear; informar que falta a review e oferecer rodá-la antes.
3. **Com** `Reviewed` — confirmar **`CI / verify` verde** (CI-04); se ok, mergear na `main`, atualizar `main` local (`checkout` + `pull`) e deletar a branch da feature (**remota** e **local**).

Não deletar `main`/`master`/`homolog`. Não usar `push --force` em `main`. Aprovação ≠ pedido genérico de “revisar” ou “abrir PR”.

Regra Cursor espelhada: `.cursor/rules/task-approval.mdc`.
