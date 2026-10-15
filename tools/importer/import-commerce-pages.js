/* eslint-disable */
/* global WebImporter */

/**
 * Commerce demo pages (commerce branch). Each page of Adobe's reference storefront
 * (aem-boilerplate-commerce) maps to a thin Sebrae shell: a short intro plus the commerce
 * block configuration — product data loads at runtime from the Adobe Commerce catalog.
 *   /search                     → /loja/cursos    (product-showcase x3 + product-list-page)
 *   /cart                       → /loja/carrinho  (commerce-cart)
 *   /products/{url-key}/{sku}   → /loja/produto   (product-details; any product via ?sku=)
 * Pages live under /loja: in DA the editor is chosen per folder (editor.path), so the folder
 * opens in the commerce branch's Universal Editor.
 */

function h(document, tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}

function link(document, href, text) {
  const p = h(document, 'p');
  const a = h(document, 'a', text);
  a.href = href;
  p.append(a);
  return p;
}

const table = (document, rows) => WebImporter.DOMUtils.createTable(rows, document);

function showcase(document, title, category, limit, label) {
  return table(document, [
    ['Product Showcase'], ['title', title], ['category', category], ['skus', ''], ['limit', limit], ['label', label],
  ]);
}

// cards block: one row per card — bold title + text
function cards(document, items) {
  return table(document, [['Cards'], ...items.map(([title, body]) => {
    const cell = document.createElement('div');
    const p1 = h(document, 'p');
    p1.append(h(document, 'strong', title));
    cell.append(p1, h(document, 'p', body));
    return [cell];
  })]);
}

function metadata(document, title, description) {
  return table(document, [['Metadata'], ['Title', title], ['Description', description]]);
}

// SKU of a reference product page: JSON-LD Product.sku, else the last URL segment
function getSku(document, url) {
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return null; } })
    .find((d) => d && d['@type'] === 'Product');
  if (ld && ld.sku) return String(ld.sku);
  const m = new URL(url).pathname.match(/\/products\/[\w-]+\/([\w-]+)$/);
  return m ? m[1].toUpperCase() : '';
}

const PAGES = {
  // layout of sp.loja.sebrae.com.br/cursos/cursos-online: showcases on top, catalog below
  search: (document) => ({
    path: '/loja/cursos',
    content: [
      h(document, 'h1', 'Cursos online'),
      h(document, 'p', 'Aprenda no seu ritmo com cursos para quem quer começar, gerenciar ou expandir o seu negócio. Muitos são gratuitos.'),
      'hr',
      showcase(document, 'Top 10 cursos mais acessados', '', '10', 'Curso online'),
      'hr',
      showcase(document, 'Marketing', 'apparel', '10', 'Curso online / Marketing'),
      'hr',
      showcase(document, 'Finanças', 'office', '10', 'Curso online / Finanças'),
      'hr',
      h(document, 'h2', 'Todos os cursos'),
      table(document, [['Product List Page'], ['category', ''], ['pageSize', '9'], ['label', 'Curso online']]),
      'hr',
      metadata(document, 'Cursos online | Sebrae', 'Cursos online do Sebrae para começar, gerenciar e expandir o seu negócio.'),
    ],
  }),
  cart: (document) => ({
    path: '/loja/carrinho',
    content: [
      h(document, 'h1', 'Seu carrinho'),
      h(document, 'p', 'Revise os itens escolhidos antes de concluir a sua inscrição.'),
      'hr',
      table(document, [['Commerce Cart'], ['startShoppingUrl', '/loja/cursos']]),
      'hr',
      metadata(document, 'Carrinho | Sebrae', 'Itens escolhidos para inscrição.'),
    ],
  }),
  product: (document, url) => ({
    path: '/loja/produto',
    content: [
      table(document, [['Product Details'], ['defaultSku', getSku(document, url)]]),
      'hr',
      // same structure as the reference product page: cards below the product, then more products
      h(document, 'h2', 'Por que aprender com o Sebrae'),
      cards(document, [
        ['Muitos cursos gratuitos', 'Boa parte dos cursos online do Sebrae não tem custo: basta fazer um cadastro simples para começar.'],
        ['No seu ritmo', 'Estude pelo computador, tablet ou celular, no horário que for melhor para você.'],
        ['Feito para pequenos negócios', 'Conteúdos práticos para quem quer começar, gerenciar ou expandir a sua empresa.'],
        ['Apoio além do curso', 'Consultorias, eventos e soluções do Sebrae para colocar o aprendizado em prática.'],
      ]),
      'hr',
      showcase(document, 'Você também pode gostar', '', '8', 'Curso online'),
      'hr',
      h(document, 'h2', 'Continue explorando'),
      link(document, '/loja/cursos', 'Ver todos os cursos e soluções'),
      'hr',
      metadata(document, 'Produto | Sebrae', 'Detalhes do curso ou solução.'),
    ],
  }),
};

export default {
  transform: ({ document, url }) => {
    const { pathname } = new URL(url);
    let key = null;
    if (/\/search\/?$/.test(pathname)) key = 'search';
    else if (/\/cart\/?$/.test(pathname)) key = 'cart';
    else if (/\/products\//.test(pathname)) key = 'product';
    if (!key) throw new Error(`No commerce demo page mapped for ${pathname}`);

    // build first (reads the source DOM), then clear and rebuild main
    const page = PAGES[key](document, url);
    const main = document.body;
    main.innerHTML = '';
    page.content.forEach((node) => main.append(node === 'hr' ? document.createElement('hr') : node));

    return [{ element: main, path: page.path, report: { page: key } }];
  },
};
