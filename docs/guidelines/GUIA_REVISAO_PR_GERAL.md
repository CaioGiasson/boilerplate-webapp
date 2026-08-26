# Guia de Revisão de Pull Requests - Boas Práticas Gerais

## 🎯 Objetivo da Revisão

Uma boa revisão de código deve:

- ✅ Garantir qualidade e consistência
- ✅ Compartilhar conhecimento
- ✅ Prevenir bugs e problemas de segurança
- ✅ Melhorar a manutenibilidade do código
- ✅ Ser construtiva e educativa

## 🔎 Como Revisar

### 1. Entenda o Contexto

Antes de revisar:

- [ ] Leia a descrição do PR
- [ ] Entenda o problema que está sendo resolvido
- [ ] Verifique issues relacionadas
- [ ] Veja o histórico de commits

### 2. Revisão Estrutural

- [ ] **Arquivos modificados**: Verifique se arquivos estão no lugar certo
- [ ] **Tamanho do PR**: PR muito grande? Sugira dividir
- [ ] **Dependências**: Novas dependências são necessárias?
- [ ] **Breaking changes**: Há breaking changes? Estão documentados?

### 3. Revisão de Código

- [ ] **Lógica**: A lógica está correta?
- [ ] **Edge cases**: Edge cases foram considerados?
- [ ] **Performance**: Há problemas de performance óbvios?
- [ ] **Segurança**: Há vulnerabilidades de segurança?
- [ ] **Testes**: Testes cobrem os casos necessários?

### 4. Revisão de Boas Práticas

Use o checklist abaixo para verificar:

- Código limpo
- TypeScript adequado
- Tratamento de erros
- Segurança
- Performance
- Observabilidade
- Migrações de banco de dados
- Testes

## 📋 Checklist de Revisão

### 🔍 Primeira Impressão

- [ ] **Título descritivo**: PR tem título claro que explica o que foi feito
- [ ] **Descrição completa**: Descrição explica o problema, solução e contexto
- [ ] **Tamanho adequado**: PR não é muito grande (idealmente < 500 linhas)
- [ ] **Commits organizados**: Commits são lógicos e atômicos
- [ ] **Branch atualizada**: Branch está atualizada com a branch base

### ✅ Código Limpo

- [ ] **Nomes descritivos**: Variáveis, funções e classes têm nomes claros

    ```typescript
    // ❌ Revisar
    const d = getData()
    const u = processUser(u)

    // ✅ Aprovar
    const userData = getUserData()
    const processedUser = processUser(userData)
    ```

- [ ] **Funções pequenas**: Funções fazem uma única coisa

    ```typescript
    // ❌ Revisar - função muito grande
    function processOrder(order) {
    	validate(order)
    	calculate(order)
    	save(order)
    	sendEmail(order)
    	log(order)
    	// ... mais 50 linhas
    }
    ```

- [ ] **Sem duplicação**: Código duplicado foi extraído
- [ ] **Comentários úteis**: Comentários explicam "porquê", não "o quê"
- [ ] **Sem código morto**: Código comentado ou não usado foi removido

### ✅ TypeScript

- [ ] **Evitar `any`**: Tipo `any` deve ser evitado. Se for estritamente necessário (ex: integração com bibliotecas sem tipagem ou dados dinâmicos complexos), deve ser justificado com comentário explicando o motivo

    ```typescript
    // ❌ Revisar - sem justificativa
    function process(data: any) {}

    // ✅ Aprovar - com justificativa
    // Usando any temporariamente devido à falta de tipos na biblioteca legacy
    function process(data: any) {}

    // ✅ Aprovar - tipado corretamente
    function process(data: UserData) {}
    ```

- [ ] **Tipos explícitos**: Tipos são claros (evitar inferência ambígua)
- [ ] **Interfaces bem definidas**: Interfaces descrevem contratos claros
- [ ] **Type guards**: Validação de tipos quando necessário
- [ ] **Generics apropriados**: Generics usados quando faz sentido

### ✅ Funções e Métodos

- [ ] **Evitar longas listas de parâmetros**: Funções com mais de 3 parâmetros devem ser refatoradas para receber um objeto de configuração (DTO/Interface). O foco é legibilidade e manutenibilidade

    ```typescript
    // ❌ Revisar - muitos parâmetros
    function createUser(name, email, age, city, country, phone) {}

    // ✅ Aprovar - objeto de configuração
    function createUser(userData: CreateUserData) {}
    ```

- [ ] **Single Responsibility**: Cada função tem uma única responsabilidade
- [ ] **Validação de entrada**: Parâmetros validados no início
- [ ] **Tratamento de erros**: Erros tratados adequadamente

### ✅ Tratamento de Erros

- [ ] **Erros específicos**: Erros customizados com mensagens claras

    ```typescript
    // ❌ Revisar
    throw new Error('Error')

    // ✅ Aprovar
    throw new ValidationError('Email format is invalid')
    ```

- [ ] **Status codes corretos**: Status HTTP apropriado
- [ ] **Logging adequado**: Erros logados com contexto
- [ ] **Não expor detalhes**: Mensagens não expõem implementação interna
- [ ] **Try/catch apropriado**: Try/catch apenas onde necessário

### ✅ Segurança

- [ ] **Validação de entrada**: Todos os inputs validados

    ```typescript
    // ❌ Revisar - sem validação
    function updateUser(userId: string, data: any) {
    	return db.users.update({ where: { id: userId }, data })
    }

    // ✅ Aprovar - com validação
    function updateUser(userId: string, data: UpdateUserData) {
    	validateUserId(userId)
    	validateUserData(data)
    	return db.users.update({ where: { id: userId }, data })
    }
    ```

- [ ] **Sanitização**: Dados sanitizados antes de processar
- [ ] **Autenticação**: Endpoints protegidos têm autenticação
- [ ] **Autorização**: Permissões verificadas
- [ ] **Secrets em .env**: Credenciais e URLs não estão hardcoded

### ✅ Performance

- [ ] **Queries otimizadas**: Queries eficientes (índices, projeções)

    ```typescript
    // ❌ Revisar - N+1 queries
    const users = await db.users.findMany()
    for (const user of users) {
    	user.posts = await db.posts.findMany({ where: { userId: user.id } })
    }

    // ✅ Aprovar - query única
    const users = await db.users.findMany({
    	include: { posts: true },
    })
    ```

- [ ] **Paginação**: Listas grandes têm paginação
- [ ] **Cache apropriado**: Cache usado quando faz sentido
- [ ] **Sem queries em loops**: Evitar queries dentro de loops
- [ ] **Timeouts configurados**: Requisições externas com timeout

### ✅ APIs REST

- [ ] **Nomenclatura RESTful**: URLs seguem convenções REST

    ```typescript
    // ❌ Revisar
    GET / getUserById / 123
    POST / createNewUser

    // ✅ Aprovar
    GET / users / 123
    POST / users
    ```

- [ ] **Métodos HTTP corretos**: GET, POST, PATCH, PUT, DELETE adequados
- [ ] **Status codes apropriados**: Status HTTP refletem resultado
- [ ] **Documentação**: API documentada em `requests/*.http` + inventário em `requests/README.md` **e** `docs/openapi.yaml` (obrigatório; Swagger UI consome o YAML)
- [ ] **Respostas consistentes**: Formato `ApiPresenter` (`success`, `message`, `data` / `code`)

### ✅ Banco de Dados

- [ ] **Transações quando necessário**: Operações atômicas usam transações
- [ ] **Índices apropriados**: Índices para queries frequentes
- [ ] **Soft delete** — preferir `deletedAt`; filtros devem considerar campo **ausente ou null** no Mongo (ver `tasks/lessons.md`)

    ```typescript
    // ❌ Revisar — assume deletedAt sempre presente
    where: {
    	deletedAt: null
    }

    // ✅ Aprovar
    where: {
    	OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }]
    }
    ```

### ✅ Testes

- [ ] **Testes criados**: Funcionalidades novas têm testes
- [ ] **Cobertura adequada**: Testes cobrem casos principais
- [ ] **Testes isolados**: Testes não dependem uns dos outros
- [ ] **Mocks adequados**: Dependências externas mockadas
- [ ] **Casos de borda**: Edge cases testados
- [ ] **Nomenclatura clara**: Nomes de testes descrevem comportamento

    ```typescript
    // ❌ Revisar
    it('test 1', () => {})

    // ✅ Aprovar
    it('should throw ValidationError when email is invalid', () => {})
    ```

### ✅ Observabilidade e Logging

- [ ] **LogManager** — não `console.log` em código de app

    ```typescript
    // ❌ Revisar
    console.log('User created', userId)

    // ✅ Aprovar
    LogManager.info('User created', { userId })
    ```

- [ ] **Níveis de log**: Uso adequado de info, warn, error
- [ ] **Contexto nos logs**: Logs incluem contexto suficiente
- [ ] **Sem dados sensíveis**: Credenciais não aparecem em logs
- [ ] **Métricas / tracing / feature flags** — desejável (backlog OBS-03/04); não bloquear PR por ausência salvo aceite explícito

### ✅ Variáveis de Ambiente

- [ ] **Configs em .env**: Configurações não hardcoded

    ```typescript
    // ❌ Revisar
    const apiUrl = 'https://api.example.com'

    // ✅ Aprovar
    const apiUrl = process.env.API_URL
    ```

- [ ] **Validação na inicialização**: Variáveis obrigatórias validadas
- [ ] **Documentação**: Variáveis documentadas no `example.env`
- [ ] **Sem secrets no código**: Secrets nunca commitados

### ✅ Git e Commits

- [ ] **Commits atômicos**: Cada commit representa mudança lógica
- [ ] **Mensagens descritivas**: Mensagens claras e descritivas

    ```
    ❌ Revisar: "fix"
    ✅ Aprovar: "Validação do formato do email na entrada para criação de user"
    ```

- [ ] **Sem arquivos desnecessários**: `.env`, `node_modules` não commitados
- [ ] **Branch naming**: Branch segue convenção de nome vinculado a issue

### ✅ Documentação

- [ ] **README / docs** — mudanças significativas documentadas no repo
- [ ] **Comentários em pt-BR** — explicam regras de negócio não óbvias
- [ ] **Contrato HTTP** — `requests/` + i18n nos três catálogos quando houver UI

### ✅ Qualidade de Código

- [ ] **Lint passou**: Linter configurado e passando
- [ ] **Formatação consistente**: Código formatado (Prettier)
- [ ] **LogManager** — não `console.log` (ver Observabilidade acima)
- [ ] **Imports organizados**: Imports organizados e sem duplicatas

## 💬 Como Dar Feedback

### ✅ Feedback Construtivo

**Bom feedback:**

```
"Essa função está fazendo muitas coisas. Que tal extrair a validação
para uma função separada `validateUserData()`? Isso tornaria o código
mais testável e reutilizável."
```

**Feedback ruim:**

```
"Essa função está errada."
```

### ✅ Perguntas vs Críticas

**Melhor:**

```
"Qual a razão de usar `any` aqui? Seria possível tipar melhor?"
```

**Evitar:**

```
"Não use `any`!"
```

### ✅ Sugestões Específicas

**Bom:**

```
"Para evitar N+1 queries, podemos usar `include: { posts: true }`
na query inicial. Exemplo: ..."
```

**Ruim:**

```
"Otimize essa query."
```

## 🚦 Níveis de Prioridade

### 🔴 Bloqueador (Must Fix)

- Vulnerabilidades de segurança
- Bugs críticos que quebram funcionalidade
- Violações graves de padrões de código
- Falta de testes em código crítico

### 🟡 Importante (Should Fix)

- Problemas de performance
- Código difícil de manter
- Falta de documentação importante
- Testes insuficientes

### 🟢 Sugestão (Nice to Have)

- Melhorias de legibilidade
- Otimizações menores
- Documentação adicional
- Refatorações não críticas

### 🧭 Change Request vs Comentário

**Change Request (obrigatório / bloqueia aprovação)**  
Use quando a mudança é necessária para manter **correção, segurança, consistência ou manutenção**.

Critérios típicos:

- **🔴 Bloqueador**: bug, vulnerabilidade, quebra de contrato/API, risco alto de incidente, perda de dados.
- **🟡 Importante**: risco relevante de manutenção/performance, comportamento ambíguo, falta de testes em fluxo importante, dívidas técnicas que vão “cobrar juros” rápido.

Formato sugerido:

- **“Change request (🔴/🟡): …”**
- Inclua **o porquê**, **risco**, e (se possível) **uma sugestão concreta**.

Exemplos:

- “Change request (🔴): falta validação de entrada; pode permitir dados inválidos e quebrar o fluxo X.”
- “Change request (🟡): isso introduz N+1; em produção tende a degradar performance.”

**Comentário (não-bloqueante / sugestão)**  
Use quando é uma melhoria desejável, mas **não essencial** para merge agora.

Critérios típicos:

- **🟢 Sugestão**: legibilidade, organização, nomes, micro-otimizações, alternativas estilísticas, refactors não críticos.
- Melhorias que podem virar **follow-up**/issue sem risco imediato.

Formato sugerido:

- **“Comentário (🟢): …”**
- Preferir perguntas e opções (“Que tal…?” / “Considerou…?”).

Exemplos:

- “Comentário (🟢): talvez renomear `x` para algo mais descritivo.”
- “Comentário (🟢): dá pra extrair essa lógica em função pra facilitar testes.”

**Mapa rápido (prioridade → tipo de feedback)**:

- **🔴 Bloqueador** → **sempre** Change Request
- **🟡 Importante** → **normalmente** Change Request (a menos que seja follow-up claramente seguro)
- **🟢 Sugestão** → **sempre** Comentário

Quando algo for “quase importante”, mas não vale bloquear:

- marque como **Comentário (🟡 opcional / follow-up)** e sugira abrir issue/tarefa como dívida técnica.

## 📝 Exemplos de Change Request || Comentários

### Exemplo 1: Validação de Entrada (Change Request 🔴)

```typescript
// Código no PR
function createUser(email: string, age: number) {
	return db.users.create({ email, age })
}
```

**Change Request (🔴):**

```
Change request (🔴): Esta função não valida os inputs. Um email inválido ou
idade negativa pode causar problemas no banco de dados e quebrar o fluxo de
criação de usuários. Risco: dados inválidos podem ser persistidos.

Sugestão: adicionar validação antes de criar:

function createUser(email: string, age: number) {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format')
  }
  if (age < 0 || age > 150) {
    throw new ValidationError('Age must be between 0 and 150')
  }
  return db.users.create({ email, age })
}
```

### Exemplo 2: Performance (Change Request 🟡)

```typescript
// Código no PR
const users = await db.users.findMany()
for (const user of users) {
	user.posts = await db.posts.findMany({ where: { userId: user.id } })
}
```

**Change Request (🟡):**

```
Change request (🟡): Isso causa problema de N+1 queries. Para 100 usuários,
serão 101 queries ao banco. Risco: em produção com muitos usuários, isso
pode degradar significativamente a performance e sobrecarregar o banco.

Sugestão: usar include para fazer join em uma única query:

const users = await db.users.findMany({
  include: { posts: true }
})
```

### Exemplo 3: TypeScript (Change Request 🟡)

```typescript
// Código no PR
function process(data: any) {
	return data.value * 2
}
```

**Change Request (🟡):**

```
Change request (🟡): O uso de `any` remove os benefícios do TypeScript e
pode causar erros em runtime se `data.value` não existir ou não for número.
Risco: perda de type safety e possíveis bugs difíceis de detectar.

Sugestão: criar uma interface para tipar corretamente:

interface ProcessableData {
  value: number
}

function process(data: ProcessableData): number {
  return data.value * 2
}
```

### Exemplo 4: Nomenclatura (Comentário 🟢)

```typescript
// Código no PR
function calc(x: number, y: number): number {
	return x + y
}
```

**Comentário (🟢):**

```
Comentário (🟢): Que tal renomear `calc` para algo mais descritivo como
`calculateSum` ou `addNumbers`? Isso tornaria o código mais legível e
auto-documentado. Não é crítico, mas seria uma melhoria.
```

### Exemplo 5: Organização (Comentário 🟢)

```typescript
// Código no PR
function processOrder(order: Order) {
	validate(order)
	calculate(order)
	save(order)
	sendEmail(order)
	log(order)
	return order
}
```

**Comentário (🟢):**

```
Comentário (🟢): Essa função está fazendo várias coisas. Considerou extrair
algumas responsabilidades em funções separadas? Por exemplo, `sendOrderEmail()`
e `logOrderCreation()`. Isso tornaria o código mais testável e reutilizável.
Não é urgente, mas seria uma boa refatoração para o futuro.
```

## ✅ Checklist Final Antes de Aprovar

1. [ ] Código segue boas práticas gerais
2. [ ] Testes criados e passando
3. [ ] Documentação atualizada
4. [ ] Lint passou
5. [ ] Sem vulnerabilidades de segurança óbvias
6. [ ] Performance considerada
7. [ ] Sem breaking changes (ou documentados)
8. [ ] Feedback dado foi endereçado
9. [ ] PR está atualizado com branch base

## 💡 Dicas para Revisores

- **Seja respeitoso**: Lembre-se que há uma pessoa do outro lado
- **Seja específico**: Comentários vagos não ajudam
- **Explique o porquê**: Ajude a pessoa a entender a razão
- **Sugira soluções**: Não apenas aponte problemas
- **Reconheça o bom trabalho**: Dê feedback positivo também
- **Aprenda junto**: Use a revisão para aprender também

## 🎯 Quando Aprovar

Aprove o PR quando:

- ✅ Código segue boas práticas
- ✅ Testes passam e cobrem casos principais
- ✅ Documentação está atualizada
- ✅ Não há problemas de segurança ou performance críticos
- ✅ Feedback importante foi endereçado
- ✅ Você entendeu o código e confia nele

**Não precisa ser perfeito**: Pequenas melhorias podem ser feitas em PRs futuros.
