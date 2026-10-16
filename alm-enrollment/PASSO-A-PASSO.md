# Passo a passo: publicar o serviço de matrícula (Adobe I/O Runtime)

Roteiro para rodar no **seu computador**, num projeto do Developer Console com **Runtime functions**. Não precisa de App Builder nem do `aio app`.

Pode ser seguido por você ou por um assistente de IA que execute comandos no terminal. Nesse caso, entregue este arquivo a ele e peça para seguir os passos na ordem.

> **Regras para quem executar (pessoa ou IA)**
> - Nunca colar Client Secret, refresh token, `workspace.json` ou o conteúdo do `.env` em chats, issues ou commits. Esses arquivos já estão no `.gitignore`.
> - O login do ALM e o do Developer Console são feitos pela própria pessoa, no navegador.
> - A saída de `npm run check`, `npm run deploy` e `npm run logs` não mostra chaves e pode ser compartilhada.

## O que vai ser publicado

| Ação no Runtime | Para que serve |
|---|---|
| `sebrae-alm/enroll` | Recebe o evento "pedido feito" do Commerce e matricula o cliente nos cursos do pedido no ALM |
| `sebrae-alm/my-courses` | Ação web chamada pelo site ("Meus cursos"): devolve os cursos do cliente logado |

## 0. Pré-requisitos (uma vez)

- **Node.js 20 ou mais novo**: https://nodejs.org (confira com `node --version`).
- **Git**: https://git-scm.com.
- Acesso ao projeto do Developer Console do Sebrae, com Runtime no workspace.

## 1. Baixar o código

```sh
git clone https://github.com/denisadobe/sebrae.git
cd sebrae
git checkout commerce-area-logada
cd alm-enrollment
npm test
```

O `npm test` deve terminar com `pass 9` e `fail 0`. Ele não chama nada externo e não precisa de `npm install`.

## 2. Credenciais do Runtime (workspace.json)

No navegador, no **Developer Console**:

1. Abra o projeto e o **workspace** que tem o Runtime.
2. Clique em **Download all**, no canto superior direito do workspace. Isso baixa um JSON.
3. Salve esse arquivo **nesta pasta** (`alm-enrollment/`) com o nome **`workspace.json`**.

O deploy lê dele o namespace e a chave do Runtime. O arquivo nunca vai para o Git.

## 3. Criar o `.env` com os dados do ALM

```sh
cp .env.example .env
```

Abra o `.env` e preencha:

| Variável | Valor |
|---|---|
| `ALM_CLIENT_ID` | Client ID da aplicação registrada no ALM (Integration Admin → Applications) |
| `ALM_CLIENT_SECRET` | Client Secret da mesma aplicação |
| `ALM_REDIRECT_URI` | `https://main--sebrae--denisadobe.aem.page/`, um dos Redirect Domains da aplicação |
| `ALM_EXTERNAL_PROFILE_ID` | ID do perfil de usuários externos (opcional, recomendado) |
| `ALM_REFRESH_TOKEN` | deixe vazio; o passo 4 preenche |

As demais linhas já vêm preenchidas para o Commerce do Sebrae.

## 4. Gerar o refresh token do ALM

```sh
npm run refresh-token
```

1. O comando mostra um endereço. Abra-o no navegador e entre com um usuário **administrador** do ALM.
2. Autorize. O navegador vai para o site do Sebrae com `?code=...` na barra de endereço.
3. Copie o endereço inteiro e cole no terminal. O código vale poucos minutos.

O resultado esperado é `OK — refresh token salvo em .env`.

## 5. Testar antes de publicar

```sh
npm run check -- <ID do curso no ALM> <e-mail de teste> <SKU do curso no Commerce>
```

Exemplo: `npm run check -- 123456 maria.teste@exemplo.com CURSO-VENDAS`.

Todas as linhas devem mostrar `OK`. Se alguma mostrar `FALHA`, copie a saída e mande para quem está acompanhando o projeto.

## 6. Publicar no Runtime

```sh
npm run deploy -- --dry-run
npm run deploy
```

- O `--dry-run` só monta os arquivos e lista o que seria enviado.
- O `npm run deploy` publica de fato.

Pode rodar de novo sempre que o código ou o `.env` mudar.

No fim, o comando mostra:

```
URL da ação my-courses (vai em alm-my-courses-url no config.json do site):
  https://<namespace>.adobeioruntime.net/api/v1/web/sebrae-alm/my-courses
```

**Mande essa URL** para quem está acompanhando o projeto. Ela não é secreta e vai para a configuração do site.

## 7. Ligar o evento "pedido feito" do Commerce à ação `enroll`

### 7.1 Developer Console: credencial para os eventos

No mesmo workspace:

1. **Add service → API → I/O Management API**, com credencial **OAuth Server-to-Server**.
2. Clique em **Download all** de novo. O JSON agora inclui essa credencial; substitua o `workspace.json` desta pasta por ele.

### 7.2 Admin do Commerce: conectar o Commerce ao workspace

O caminho do menu pode variar um pouco entre versões. Se não encontrar, tire um print e mande para quem está acompanhando.

1. **Stores → Configuration → Adobe Services → Adobe I/O Events → General configuration**:
   - em *Adobe I/O Workspace Configuration*, cole o conteúdo do `workspace.json`;
   - em *Adobe Commerce Instance ID*, preencha `sebrae-loja`;
   - salve.
2. Em **Commerce events**, deixe **Enabled = Yes**. Clique em **Create Event Provider**, se aparecer, e salve.
3. **System → Events → Event Subscriptions → Add new**:
   - *Event name*: `observer.sales_order_place_after`;
   - *Fields*: `increment_id`, `customer_email`, `customer_firstname`, `customer_lastname`, `items[].sku`;
   - salve com *Enabled*.

### 7.3 Developer Console: registrar o evento na ação

No workspace:

1. **Add event**, escolha o provedor do Commerce (criado no 7.2) e clique em **Next**.
2. Marque o evento **`observer.sales_order_place_after`** e clique em **Next**.
3. Escolha a credencial OAuth Server-to-Server e clique em **Next**.
4. Dê um nome (ex.: `Pedido para matrícula ALM`). Em *How to receive events*, escolha **Runtime action** e selecione **`sebrae-alm/enroll`**.
5. Salve.

## 8. Testar de ponta a ponta

1. No Admin do Commerce, coloque o ID do curso do ALM no campo `alm_course_id` de um produto **virtual** a R$ 0.
2. No site, entre com uma conta, inscreva-se nesse curso e finalize o pedido.
3. Veja se a matrícula rodou:

   ```sh
   npm run logs
   ```

   O esperado é `"status": "enrolled"` no resultado mais recente. O comando `npm run logs -- my-courses` mostra as chamadas do site.
4. Em **Minha conta → Meus cursos**, o curso aparece e abre dentro do site. Para isso, a URL do passo 6 precisa já estar na configuração do site.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `FALHA ALM: token de administrador` | Client ID/Secret errados ou refresh token vencido: rode `npm run refresh-token` de novo |
| `FALHA ... token de aluno` com 401/403 | A aplicação do ALM precisa dos 4 escopos (Admin read/write, Learner read/write) |
| `FALHA Commerce: atributo` | O atributo `alm_course_id` precisa estar visível na loja (*Visible on Catalog Pages on Storefront*) e o catálogo precisa ter sido sincronizado (alguns minutos) |
| `FALHA Runtime credentials not found` | Falta o `workspace.json` nesta pasta (passo 2) |
| `FALHA PUT /packages... 401/403` | O `workspace.json` é de outro workspace ou não tem Runtime; baixe de novo no workspace certo |
| Pedido feito e `npm run logs` diz "Nenhuma execução" | Confira a assinatura do evento (7.2) e o registro na ação (7.3) |
| `npm run logs` mostra `"enrolled": []` | O produto do pedido não tem `alm_course_id` preenchido |
