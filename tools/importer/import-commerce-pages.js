/* eslint-disable */
/* global WebImporter */

/**
 * Commerce demo pages (commerce branch). Each page of Adobe's reference storefront
 * (aem-boilerplate-commerce) maps to a thin Sebrae shell: a short intro plus the commerce
 * block configuration — product data loads at runtime from the Adobe Commerce catalog.
 *   /search                     → /cursos   (product-list-page)
 *   /cart                       → /carrinho (commerce-cart)
 *   /products/{url-key}/{sku}   → /produto  (product-details; any product via ?sku=)
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
  search: (document) => ({
    path: '/cursos',
    content: [
      h(document, 'h1', 'Cursos e soluções'),
      h(document, 'p', 'Encontre cursos, eventos e materiais para o seu negócio. Use a busca e os filtros para chegar mais rápido ao que você precisa — muitos conteúdos são gratuitos.'),
      'hr',
      table(document, [['Product List Page'], ['category', ''], ['pageSize', '9']]),
      'hr',
      metadata(document, 'Cursos e soluções | Sebrae', 'Catálogo de cursos e soluções do Sebrae.'),
    ],
  }),
  cart: (document) => ({
    path: '/carrinho',
    content: [
      h(document, 'h1', 'Seu carrinho'),
      h(document, 'p', 'Revise os itens escolhidos antes de concluir a sua inscrição.'),
      'hr',
      table(document, [['Commerce Cart'], ['startShoppingUrl', '/cursos']]),
      'hr',
      metadata(document, 'Carrinho | Sebrae', 'Itens escolhidos para inscrição.'),
    ],
  }),
  product: (document, url) => ({
    path: '/produto',
    content: [
      table(document, [['Product Details'], ['defaultSku', getSku(document, url)]]),
      'hr',
      h(document, 'h2', 'Continue explorando'),
      link(document, '/cursos', 'Ver todos os cursos e soluções'),
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
