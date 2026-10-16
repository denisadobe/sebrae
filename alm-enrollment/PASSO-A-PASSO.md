# Sebrae: integração Loja (Adobe Commerce) → Adobe Learning Manager

Guia completo e autossuficiente para configurar e publicar a integração. Pode ser seguido por uma pessoa ou por um **assistente de IA que execute comandos no terminal**. Para a IA: leia o documento inteiro antes de começar e siga as partes na ordem.

---

## 1. Contexto

O site do Sebrae (AEM Edge Delivery Services) tem uma loja de cursos sobre o **Adobe Commerce as a Cloud Service (ACCS)**:

- o cliente cria conta, escolhe cursos gratuitos e finaliza o pedido sem pagamento;
- o curso em si é consumido no **Adobe Learning Manager (ALM)**.

Este guia publica o serviço que liga os dois:

```
Commerce: pedido feito ──(Adobe I/O Events)──▶ ação enroll ──▶ ALM: cria o aluno + matricula no curso
Site "Meus cursos" ──(token do cliente)──▶ ação my-courses ──▶ ALM: cursos do aluno + token do player
```

| Ação (Adobe I/O Runtime) | O que faz |
|---|---|
| `sebrae-alm/enroll` | Recebe o evento `observer.sales_order_save_after`. Para cada produto do pedido com o atributo `alm_course_id`, garante que o cliente existe no ALM (cria como usuário externo) e o matricula no curso. Esse evento dispara a cada vez que o pedido é salvo (no Commerce SaaS não existe o `sales_order_place_after`). A ação é idempotente: o mesmo pedido de novo não duplica a matrícula. |
| `sebrae-alm/my-courses` | Ação web chamada pelo site. Valida o token do cliente no Commerce e devolve os cursos dele no ALM, mais um token de aluno de 1 hora para abrir o player do ALM dentro do site. |

O projeto do Developer Console é do tipo **Runtime functions**, não App Builder. Por isso a publicação usa `npm run deploy`, que fala direto com a API do Runtime; **não use `aio app deploy`**.

## 2. Regras de segurança (obrigatórias)

- **Nunca** copiar para chats, issues, commits ou mensagens:
  - o **Client Secret** do ALM;
  - o **refresh token**;
  - o conteúdo do **`.env`**;
  - o **`workspace.json`**.
- O `.env` e o `workspace.json` ficam só na pasta `alm-enrollment/` e já estão no `.gitignore`. **Não commitar e não fazer push** de nada neste repositório.
- Logins (ALM, Developer Console, Admin do Commerce) são feitos **pela pessoa**, no navegador. A IA não deve pedir senhas.
- A saída de `npm test`, `npm run check`, `npm run deploy` e `npm run logs` não mostra chaves e **pode ser compartilhada**.

## 3. Dados do projeto

| Item | Valor |
|---|---|
| Repositório | https://github.com/denisadobe/sebrae (público) |
| Branch | `commerce-area-logada` |
| Pasta do serviço | `alm-enrollment/` |
| Site (pré-visualização) | https://commerce-area-logada--sebrae--denisadobe.aem.page/loja/cursos |
| Commerce GraphQL (ACCS sandbox) | `https://na1-sandbox.api.commerce.adobe.com/TcvPqpzQp1aRq3ohMQt2ct/graphql` |
| Commerce: website / store / store view | `base` / `main_website_store` / `default` |
| ALM | `https://learningmanager.adobe.com` (conta 115171) |
| Developer Console (projeto/workspace) | https://developer.adobe.com/console/projects/914391/4566206088345778101/overview |

## 4. Parte A: Adobe Learning Manager

### A.1 Aplicação de integração

No ALM: **Integration Admin → Applications → Register**. Se a aplicação já foi criada, confira se está assim:

| Campo | Valor |
|---|---|
| Application Name | `Sebrae Loja - Matrícula` (qualquer nome serve) |
| URL | `https://main--sebrae--denisadobe.aem.page` |
| Redirect Domains | `https://main--sebrae--denisadobe.aem.page` (um por linha; opcionalmente também `https://*.aem.page` e `https://*.aem.live`) |
| Description | `Matrícula automática dos pedidos da loja e "Meus cursos" no site` |
| Scopes | ✅ Admin role read, ✅ Admin role write, ✅ Learner role read, ✅ Learner role write. ❌ os dois de xAPI |
| For this account only? | **Yes** |

Depois de salvar, anote o **Client ID** (pode ser compartilhado) e o **Client Secret** (secreto, só no `.env`).

### A.2 Perfil de usuários externos (recomendado)

No ALM, como administrador: **Users → External → Add**.

- Crie um perfil, por exemplo `Clientes da Loja`, e anote o **ID** dele (aparece na URL ou nos detalhes do perfil).
- Com o perfil, os clientes entram como **usuários externos**, que não consomem licenças internas.
- Sem o perfil, o serviço cria **usuários internos**.

### A.3 Curso de teste

Escolha ou crie um curso **publicado**, com inscrição livre (*Self Enroll*). Anote o **ID** do curso: o número na URL do curso no ALM, por exemplo `123456` (o serviço aceita `123456` ou `course:123456`).

## 5. Parte B: Adobe Commerce (Admin)

### B.1 Atributo com o ID do curso

**Stores → Attributes → Product → Add New Attribute**:

| Campo | Valor |
|---|---|
| Default Label | `ID do curso no ALM` |
| Catalog Input Type | Text Field |
| Attribute Code (Advanced) | **`alm_course_id`** |
| Storefront Properties → Visible on Catalog Pages on Storefront | **Yes** (obrigatório, para o serviço conseguir ler o valor) |

Salve. Depois, em **Stores → Attributes → Attribute Set → Default**, arraste `alm_course_id` para um grupo e salve.

### B.2 Produto do curso

**Catalog → Products → Add Product → Virtual Product**:

- Nome e SKU do curso, por exemplo SKU `CURSO-TESTE`.
- **Price**: `0`.
- Quantidade em estoque: alta (por exemplo 100000), *Stock Status*: In Stock.
- **ID do curso no ALM**: o ID do passo A.3.
- Visível no catálogo e no website `Main Website`.

Aguarde alguns minutos para o catálogo sincronizar.

### B.3 Pagamento

**Stores → Configuration → Sales → Payment Methods**: deixe **Zero Subtotal Checkout** ativo, com *New Order Status* = Pending ou Processing. Para os cursos grátis não é preciso nenhum outro método.

## 6. Parte C: publicar no Adobe I/O Runtime

### C.0 Pré-requisitos

- **Node.js 20 ou mais novo** (`node --version`) e **Git**.
- Não precisa de `npm install` nem do `aio`.

### C.1 Baixar o código e testar

```sh
git clone https://github.com/denisadobe/sebrae.git
cd sebrae
git checkout commerce-area-logada
cd alm-enrollment
npm test
```

O esperado é `pass 9` e `fail 0`. Todos os comandos a partir daqui são rodados dentro de `alm-enrollment/`.

### C.2 Credenciais do Runtime (`workspace.json`)

No Developer Console (link na seção 3), abra o **workspace** do projeto que tem Runtime e clique em **Download all**, no canto superior direito. Salve o JSON baixado como **`alm-enrollment/workspace.json`**.

### C.3 Arquivo `.env`

```sh
cp .env.example .env
```

Edite o `.env`:

| Variável | Valor |
|---|---|
| `ALM_CLIENT_ID` | Client ID (A.1) |
| `ALM_CLIENT_SECRET` | Client Secret (A.1) |
| `ALM_REDIRECT_URI` | `https://main--sebrae--denisadobe.aem.page/` (já vem preenchido) |
| `ALM_EXTERNAL_PROFILE_ID` | ID do perfil externo (A.2), ou vazio |
| `ALM_REFRESH_TOKEN` | deixe vazio; o C.4 preenche |

As outras variáveis (Commerce e idioma) já vêm com os valores certos. A última linha (`AIO_events_...`) só é usada pelo `aio app` e pode ficar como está.

### C.4 Refresh token do ALM

```sh
npm run refresh-token
```

1. O comando mostra um endereço. A **pessoa** abre o endereço no navegador e entra com um usuário **administrador** do ALM.
2. Depois de autorizar, o navegador vai para o site do Sebrae com `?code=...` na barra de endereço.
3. Copie o endereço inteiro e cole no terminal, rápido: o código vale poucos minutos.

O esperado é `OK — refresh token salvo em .env`.

### C.5 Conferir ALM e Commerce

```sh
npm run check -- <ID do curso (A.3)> <e-mail de teste> <SKU do curso (B.2)>
```

Exemplo: `npm run check -- 123456 maria.teste@exemplo.com CURSO-TESTE`.

Todas as linhas devem mostrar `OK`. Se o e-mail ainda não existir no ALM, a linha do token de aluno diz que ele será criado na primeira matrícula, e isso é normal.

### C.6 Publicar

```sh
npm run deploy -- --dry-run
npm run deploy
```

- O `--dry-run` só monta os arquivos e lista o que seria enviado.
- O `npm run deploy` publica de fato. Pode ser repetido sempre que o código ou o `.env` mudar.

No fim aparece:

```
URL da ação my-courses (vai em alm-my-courses-url no config.json do site):
  https://<namespace>.adobeioruntime.net/api/v1/web/sebrae-alm/my-courses
```

## 7. Parte D: evento "pedido feito" → ação `enroll`

O caminho dos menus pode variar um pouco entre versões. Se algo não bater, tire um print da tela.

### D.1 Developer Console: credencial para eventos

No mesmo workspace:

1. **Add service → API → I/O Management API**, com credencial **OAuth Server-to-Server**. Salve.
2. Clique em **Download all** de novo e **substitua** o `alm-enrollment/workspace.json` por esse arquivo novo.

### D.2 Admin do Commerce: conectar ao workspace

1. **Stores → Configuration → Adobe Services → Adobe I/O Events → General configuration**:
   - *Adobe I/O Workspace Configuration*: cole o conteúdo do `workspace.json` (D.1);
   - *Adobe Commerce Instance ID*: `sebrae-loja`;
   - salve.
2. Na mesma área, em **Commerce events**, deixe **Enabled = Yes**. Clique em **Create Event Provider**, se aparecer, e salve.
3. **System → Events → Event Subscriptions → Add New Subscribed Event**:
   - *Event name*: `observer.sales_order_save_after`;
   - *Fields*, um por linha: `increment_id`, `customer_email`, `customer_firstname`, `customer_lastname`, `items[].sku`;
   - *Enabled*: Yes. Salve.

### D.3 Developer Console: registrar o evento na ação

No workspace:

1. **Add event**, escolha o provedor do **Commerce** (criado no D.2) e clique em **Next**.
2. Marque **`observer.sales_order_save_after`** e clique em **Next**.
3. Escolha a credencial **OAuth Server-to-Server** e clique em **Next**.
4. Nome: `Pedido para matrícula ALM`. Em *How to receive events*, escolha **Runtime action** e selecione **`sebrae-alm/enroll`**.
5. Salve.

## 8. Parte E: teste de ponta a ponta

A URL da `my-courses` (C.6) precisa estar no site para "Meus cursos" funcionar. Quem cuida do site faz isso; veja a seção 9.

1. No site (https://commerce-area-logada--sebrae--denisadobe.aem.page/loja/cursos), entre ou crie uma conta, adicione o curso de teste (B.2) ao carrinho e finalize a inscrição.
2. No terminal:

   ```sh
   npm run logs
   ```

   O esperado, na execução mais recente, é `"enrolled": [{ ..., "status": "enrolled" }]`. Para ver as chamadas do site, use `npm run logs -- my-courses`.
3. No ALM, o cliente aparece matriculado no curso.
4. No site, **Minha conta → Meus cursos** mostra o curso. O botão **Começar** abre o player do ALM dentro do site.

## 9. O que devolver para quem cuida do site

Envie (nada disso é secreto):

1. A **saída do `npm run check`** (C.5).
2. A **URL da ação `my-courses`** (C.6).
3. A **saída do `npm run logs`** depois do pedido de teste (E.2).
4. **Prints** de qualquer tela que não bateu com o guia.

**Não envie** Client Secret, refresh token, `.env` nem `workspace.json`.

## 10. Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `npm test` falha | Confira `node --version` (precisa ser 20 ou mais) |
| `FALHA ALM: token de administrador` | Client ID/Secret errados ou refresh token vencido: rode `npm run refresh-token` de novo |
| `npm run refresh-token`: `token exchange failed` | O código expirou (repita mais rápido) ou o `ALM_REDIRECT_URI` não está nos Redirect Domains da aplicação |
| `FALHA ALM: token de aluno` com 401/403 | A aplicação precisa dos 4 escopos (A.1) |
| `FALHA ALM: curso` | ID errado ou curso não publicado (A.3) |
| `FALHA ALM: perfil externo` | ID do perfil errado (A.2); ou deixe `ALM_EXTERNAL_PROFILE_ID` vazio |
| `FALHA Commerce: atributo ... sem valor` | `alm_course_id` vazio no produto, sem *Visible on Catalog Pages on Storefront = Yes* (B.1), ou catálogo ainda sincronizando |
| `FALHA Runtime credentials not found` | Falta o `workspace.json` (C.2) |
| `FALHA PUT /packages... 401/403` | O `workspace.json` é de outro workspace ou sem Runtime: baixe de novo no workspace certo |
| Depois do pedido, `npm run logs` diz "Nenhuma execução" | O evento assinado no Commerce (D.2) precisa ser **o mesmo** registrado no Developer Console (D.3). Por exemplo, se o Commerce envia `sales_order_save_after`, o registro precisa ser desse evento. Confira em Developer Console → workspace → registro do evento → **Debug Tracing** se as entregas chegam e para qual ação vão |
| Quer testar o ALM sem o evento | `npm run enroll-test -- <e-mail> <SKU>` chama a ação `enroll` direto, com um pedido de teste |
| `npm run logs` mostra `"enrolled": []` | O produto do pedido não tem `alm_course_id` |
| `npm run logs` mostra erro do ALM ao criar usuário | Perfil externo inválido ou e-mail já usado por outro tipo de usuário: mande a saída para quem cuida do site |

## 11. Referência rápida

| Comando (em `alm-enrollment/`) | Para quê |
|---|---|
| `npm test` | Testes locais (sem rede, sem credenciais) |
| `npm run refresh-token` | Gera o refresh token do ALM e salva no `.env` |
| `npm run check -- <curso> <e-mail> <SKU>` | Confere ALM e Commerce com o `.env` |
| `npm run deploy -- --dry-run` | Mostra o que seria publicado |
| `npm run deploy` | Publica as ações `sebrae-alm/enroll` e `sebrae-alm/my-courses` |
| `npm run logs [enroll\|my-courses] [quantidade]` | Últimas execuções das ações |
| `npm run enroll-test -- <e-mail> <SKU>` | Matricula na mão (testa o ALM sem o evento do Commerce) |
