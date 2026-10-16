# Passo a passo: publicar o serviço de matrícula no App Builder

Roteiro para rodar no **seu computador**. Pode ser seguido por você ou por um assistente de IA que execute comandos no terminal. Nesse caso, entregue este arquivo a ele e peça para seguir os passos na ordem.

> **Regras para quem executar (pessoa ou IA)**
> - Nunca colar Client Secret, refresh token ou o conteúdo do `.env` em chats, issues ou commits. O `.env` já está no `.gitignore`.
> - Os logins (`aio login` e o login do ALM) são feitos pela própria pessoa, no navegador.
> - Os comandos `npm run check` e `npm run refresh-token` nunca mostram as chaves. A saída deles pode ser compartilhada.

## 0. Pré-requisitos (uma vez)

- **Node.js 22 ou mais novo**: https://nodejs.org (confira com `node --version`).
- **Git**: https://git-scm.com.
- Acesso ao projeto do Developer Console do Sebrae, como Developer ou System Admin da organização.

```sh
npm install -g @adobe/aio-cli
aio --version
```

## 1. Baixar o código

```sh
git clone https://github.com/denisadobe/sebrae.git
cd sebrae
git checkout commerce-area-logada
cd alm-enrollment
```

## 2. Entrar na Adobe e escolher o projeto

```sh
aio login
```

O navegador abre: entre com a conta Adobe da organização.

```sh
aio app use
```

- Escolha a organização, o projeto (o do Developer Console que tem o App Builder) e o workspace **Stage**.
- Se perguntar sobre o `.env`, escolha **merge**.

O comando cria o `.env` com as variáveis `AIO_...`, que são as credenciais do Runtime.

## 3. Completar o `.env` com os dados do ALM

Abra `.env.example`, copie as linhas a partir de `# Adobe Learning Manager` para o **final** do `.env` e preencha:

| Variável | Valor |
|---|---|
| `ALM_CLIENT_ID` | Client ID da aplicação registrada no ALM |
| `ALM_CLIENT_SECRET` | Client Secret da mesma aplicação |
| `ALM_REDIRECT_URI` | `https://main--sebrae--denisadobe.aem.page/`, um dos Redirect Domains da aplicação |
| `ALM_EXTERNAL_PROFILE_ID` | ID do perfil de usuários externos (opcional, recomendado) |
| `ALM_REFRESH_TOKEN` | deixe vazio; o passo 4 preenche |
| `AIO_events_providermetadata_to_provider_mapping` | preenchido no passo 6 |

## 4. Gerar o refresh token do ALM

```sh
npm run refresh-token
```

1. O comando mostra um endereço. Abra-o no navegador e entre com um usuário **administrador** do ALM.
2. Autorize. O navegador vai para o site do Sebrae com `?code=...` na barra de endereço.
3. Copie o endereço inteiro e cole no terminal.

O resultado esperado é `OK — refresh token salvo em .env`.

## 5. Testar antes de publicar

```sh
npm test
npm run check -- <ID do curso no ALM> <e-mail de teste> <SKU do curso no Commerce>
```

Exemplo: `npm run check -- 123456 maria.teste@exemplo.com CURSO-VENDAS`.

Todas as linhas devem mostrar `OK`. Se alguma mostrar `FALHA`, copie a saída e mande para quem está acompanhando o projeto. A saída não contém chaves.

## 6. Eventos do Commerce (pedido feito → matrícula)

### 6.1 No Developer Console (navegador)

No projeto, workspace **Stage**:

1. **Add service → API**: adicione **I/O Management API**, se ainda não estiver lá.
2. **Download all** (canto superior direito): baixa o JSON do workspace. Guarde com cuidado, porque ele tem credenciais.

### 6.2 No Admin do Commerce

O caminho do menu pode variar um pouco entre versões.

1. **Stores → Configuration → Adobe Services → Adobe I/O Events → General configuration**:
   - em *Adobe I/O Workspace Configuration*, cole o conteúdo do JSON baixado;
   - em *Adobe Commerce Instance ID*, preencha `sebrae-loja` (sem espaços);
   - salve.
2. Ainda em Adobe I/O Events, em **Commerce events**, deixe **Enabled = Yes**. Clique em **Create Event Provider**, se o botão aparecer, e salve.
3. **System → Events → Event Subscriptions → Add new**:
   - *Event name*: `observer.sales_order_place_after`;
   - *Fields*: `increment_id`, `customer_email`, `customer_firstname`, `customer_lastname`, `items[].sku`;
   - salve com *Enabled*.

### 6.3 Ligar o provedor de eventos ao app

```sh
aio event provider list
```

Pegue o **ID** do provedor do Commerce, aquele com `dx_commerce_events`, e coloque no `.env`:

```
AIO_events_providermetadata_to_provider_mapping=dx_commerce_events:<ID do provedor>
```

## 7. Publicar

```sh
aio app deploy
```

No fim, o comando lista as ações. Copie a URL da **`my-courses`**, algo como:

```
https://<namespace>.adobeioruntime.net/api/v1/web/sebrae-alm/my-courses
```

Mande essa URL para quem está acompanhando. Ela não é secreta e vai para a configuração do site (`alm-my-courses-url`).

## 8. Testar de ponta a ponta

1. No Commerce, coloque o ID do curso no campo `alm_course_id` de um produto virtual a R$ 0.
2. No site, entre com uma conta, inscreva-se nesse curso e finalize o pedido.
3. Veja se a matrícula rodou:

   ```sh
   aio rt activation list
   aio rt activation logs <id da ativação do enroll>
   ```

   O esperado é `"status": "enrolled"`.
4. Em **Minha conta → Meus cursos**, o curso aparece e abre dentro do site.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `FALHA ALM: token de administrador` | Client ID/Secret errados ou refresh token vencido: rode `npm run refresh-token` de novo |
| `FALHA ... token de aluno` com 401/403 | A aplicação precisa dos 4 escopos (admin e learner, read e write); registre de novo se necessário |
| `FALHA Commerce: atributo` | O atributo `alm_course_id` precisa estar visível na loja (*Visible on Catalog Pages on Storefront*) e o catálogo precisa ter sido sincronizado (alguns minutos) |
| `aio app deploy` reclama do provider | Confira `AIO_events_providermetadata_to_provider_mapping` no `.env` (passo 6.3) |
| Pedido feito e nada no `aio rt activation list` | Confira a assinatura do evento no Admin do Commerce (passo 6.2) e se o pedido não foi como visitante |
