# Matrícula no Adobe Learning Manager (App Builder)

Serviço que liga a loja (Adobe Commerce as a Cloud Service) ao Adobe Learning Manager (ALM):

- **`enroll`**: recebe o evento "pedido feito" do Commerce. Para cada produto do pedido que tenha o ID de um curso do ALM, cria o aluno no ALM, se ele ainda não existir, e faz a matrícula.
- **`my-courses`**: ação web chamada pelo componente "Meus cursos" do site. Confere o token do cliente no Commerce e devolve os cursos dele com um token de aluno de curta duração, usado para abrir o player do ALM dentro do site.

As credenciais do ALM ficam só aqui (variáveis do App Builder) e nunca vão para o navegador nem para o Git. A pasta não é publicada pelo site (`.hlxignore`).

```
Commerce: pedido feito ──(I/O Events)──▶ enroll ──▶ ALM: aluno + matrícula
Site "Meus cursos" ──(token do cliente)──▶ my-courses ──▶ ALM: cursos + token de aluno ──▶ player no site
```

> Para publicar, siga o **[passo a passo](PASSO-A-PASSO.md)**, com os comandos na ordem.

## 1. Commerce: ID do curso no produto

1. Crie o atributo de produto **`alm_course_id`** (texto). Em *Storefront Properties*, deixe **Visible on Catalog Pages on Storefront = Yes**, para o Catalog Service devolver o valor.
2. Em cada curso (produto **virtual**, preço 0), preencha o ID do curso no ALM: `123` ou `course:123`. O número aparece na URL do curso no ALM.
3. Pagamento: deixe ativo só **Zero Subtotal Checkout**.

## 2. ALM: aplicação de integração

No Integration Admin (Applications > Register):

- Escopos: `admin:read`, `admin:write`, `learner:read`, `learner:write`.
- Anote o **Client ID** e o **Client Secret**. Em *Developer Resources > Access Tokens*, gere o **refresh token**.
- Recomendado: crie um **perfil de usuários externos** (Users > External) para os clientes da loja e anote o ID dele. Sem o perfil, os alunos são criados como usuários internos, que consomem licenças.

## 3. App Builder

No projeto do Developer Console (workspace Stage):

1. Adicione o serviço **I/O Events for Adobe Commerce** e configure o eventing no Commerce, apontando para este projeto.
2. Assine o evento `observer.sales_order_place_after` com os campos `increment_id`, `customer_email`, `customer_firstname`, `customer_lastname` e `items[].sku`.
3. Nesta pasta:

```sh
npm install -g @adobe/aio-cli
aio login
aio app use            # escolha o projeto/workspace do Sebrae
cp .env.example .env   # preencha as credenciais do ALM (não commitar)
npm test               # testes locais, sem chamadas externas
npm run check -- 123 cliente@exemplo.com SKU-DO-CURSO   # confere ALM e Commerce com o .env
aio app deploy
```

O `deploy` cria a ação `my-courses`, com URL `https://{namespace}.adobeioruntime.net/api/v1/web/sebrae-alm/my-courses`, e registra a ação `enroll` no evento de pedido.

## 4. Site

Em `config.json` (raiz do site), preencha `alm-my-courses-url` com a URL da ação `my-courses` e publique o código. Na página `/loja/conta`, adicione o bloco **Meus cursos (Learning Manager)** acima de **Minha conta**.

## Verificar depois do primeiro deploy

- O token de aluno é gerado em `POST /oauth/o/learnerToken` (API headless do ALM). Confirme que a aplicação registrada tem essa permissão na conta.
- O player abre em `https://learningmanager.adobe.com/app/player?lo_id=…&access_token=…` dentro de um iframe. O ALM só permite o iframe com um token válido; sem token, ele redireciona para a tela de login, que bloqueia iframes.
- Logs: `aio app logs` ou `aio rt activation list`.
