# Progresso do projeto (memória entre sessões)

Este arquivo é a memória do projeto. O ambiente do assistente é recriado a cada login:
o repositório é clonado de novo (só a `main`), e o histórico de conversa e a memória local
se perdem. **Só sobrevive o que foi enviado ao GitHub.** Atualize este arquivo ao fim de cada
etapa, faça commit e push.

Última atualização: 2026-10-16

## Ao começar uma sessão

```sh
git fetch origin '+refs/heads/*:refs/remotes/origin/*'   # o clone traz só a main
git log --oneline main..origin/commerce-area-logada        # o que ainda não foi para a main
```

## Trabalho em paralelo com outra IA (cuidado)

A pessoa responsável está seguindo `alm-enrollment/PASSO-A-PASSO.md` **no computador dela, com
outra IA**, na branch `commerce-area-logada`. As duas podem alterar os mesmos arquivos.

- Antes de editar qualquer arquivo da branch: `git fetch` e confira se há commits novos em
  `origin/commerce-area-logada`. Trabalhe sempre sobre a versão mais recente.
- **Não mexa em `alm-enrollment/`** enquanto o passo a passo estiver em andamento, a não ser
  que peçam.
- O `.env` só existe na máquina local. Ele nunca vai para o Git nem para o chat.
- Faça commits pequenos e use `git pull --rebase` antes do push. Nunca use `push --force`.
- Este arquivo (`PROGRESSO.md`) fica na `main` para não conflitar com a branch.

## Estado

### Na `main` (publicado)
- Home do Sebrae com Universal Editor e blocos do portal. A página `/componentes` é a demo dos componentes.
- Formulário nativo, preparado para agentes (labels legíveis, anotações WebMCP).
- Commerce, demo em `/loja`: PDP (`product-details`), PLP (`product-list-page`), carrinho
  (`commerce-cart`), mini-cart no header, `product-showcase` com card no estilo da loja Sebrae.
  O código de commerce só carrega quando a página precisa.
- Brand Concierge: popup, página cheia e drawer no estilo Experience League.
- Agentic: `llms.txt`, ferramentas WebMCP, manifest ARD.

### Na branch `commerce-area-logada` (ainda não foi para a main)
- **Commerce, área logada**: blocos `commerce-auth` (entrar/cadastro/senha), `commerce-account`,
  `commerce-order` e `commerce-checkout`, este só com pagamento offline (venda de cursos gratuitos).
  Labels em pt-BR em `scripts/commerce-account-labels.js`. No header, o link `/loja/entrar` vira
  "Minha conta" quando o cliente está logado.
- Commerce apontando para o sandbox **Adobe Commerce as a Cloud Service** do Sebrae: um endpoint
  para Core e Catalog Service, imagens servidas pelo Commerce.
- **ALM (Adobe Learning Manager)**:
  - `alm-enrollment/` (App Builder, não é servido pelo site):
    - `enroll` recebe o evento `observer.sales_order_place_after` e matricula o cliente nos cursos
      dos produtos comprados (atributo `alm_course_id`). Cria o aluno, se ele não existir.
    - `my-courses` (ação web) valida o token do cliente no Commerce e devolve as matrículas mais
      um token curto de aluno.
    - Scripts `npm test`, `npm run check` e `npm run refresh-token`.
  - Bloco `alm-courses` ("Meus cursos"): progresso e player do ALM num dialog.
  - Guias: `alm-enrollment/README.md` e `alm-enrollment/PASSO-A-PASSO.md`.

## Em andamento

- [ ] A pessoa responsável está executando o `PASSO-A-PASSO.md` (deploy no App Builder). Ela
      avisa quando terminar e manda a URL da ação `my-courses`.

## Próximos passos (depois do passo a passo)

1. Preencher `alm-my-courses-url` no `config.json` (na branch) com a URL da `my-courses`.
2. Na página `/loja/conta`, colocar o bloco **Meus cursos (Learning Manager)** acima de
   **Minha conta**.
3. Conferir depois do primeiro deploy:
   - se a aplicação ALM consegue gerar o token de aluno (`POST /oauth/o/learnerToken`);
   - se o player abre no iframe com `access_token`. Sem token, cai no login, que bloqueia iframe.
4. Teste de ponta a ponta: produto virtual a R$ 0 com `alm_course_id` → pedido com conta logada
   → `enroll` com `"status": "enrolled"` → curso aparece em "Meus cursos" e abre no site.
5. PR de `commerce-area-logada` para a `main`, com o link
   `https://commerce-area-logada--sebrae--denisadobe.aem.page/loja/...` (sem o link, o PR é
   rejeitado).

## Pendências / a confirmar

- Havia mais componentes e etapas planejados para depois do ALM. Eles ficaram só na conversa
  que se perdeu em 2026-10-16. Peça à pessoa responsável para relembrar e registre aqui.
