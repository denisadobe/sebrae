/*
 * Product list: Adobe Commerce product discovery drop-in — search / category listing with
 * filters (facets), sort, pagination and product cards with add to cart.
 * Authoring (key-value table, all optional):
 *   category  | catalog category path (e.g. apparel) — empty = whole catalog
 *   pageSize  | products per page (default 9)
 * The search phrase comes from ?q= (header search can link here).
 */
import { readBlockConfig } from '../../scripts/aem.js';
import {
  getProductLink, initializeCart, initializeSearch,
} from '../../scripts/commerce.js';

const div = (name) => {
  const d = document.createElement('div');
  d.className = `product-list-page-${name}`;
  return d;
};

const VISIBILITY = { attribute: 'visibility', in: ['Search', 'Catalog, Search'] };

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const category = (config.category || '').trim().replace(/^\/|\/$/g, '');
  const pageSize = parseInt(config.pagesize, 10) || 9;
  const params = new URLSearchParams(window.location.search);
  const phrase = params.get('q') || '';

  // authored rows stay in the DOM (hidden) so the block keeps its Universal Editor instrumentation
  const source = div('source');
  source.append(...block.children);
  source.hidden = true;

  const info = div('info');
  info.setAttribute('role', 'status');
  info.setAttribute('aria-live', 'polite');
  const toggle = div('toggle');
  const facets = div('facets');
  const sort = div('sort');
  const list = div('list');
  const pagination = div('pagination');
  const alert = div('alert');
  alert.setAttribute('role', 'status');
  const wrapper = div('wrapper');
  wrapper.append(info, toggle, facets, sort, list, pagination);
  block.replaceChildren(alert, wrapper, source);

  try {
    await initializeSearch();
    const [
      { search }, { render }, { events }, components, SearchResults, Facets, SortBy, Pagination,
    ] = await Promise.all([
      import('@dropins/storefront-product-discovery/api.js'),
      import('@dropins/storefront-product-discovery/render.js'),
      import('@dropins/tools/event-bus.js'),
      import('@dropins/tools/components.js'),
      ...['SearchResults', 'Facets', 'SortBy', 'Pagination']
        .map((name) => import(`@dropins/storefront-product-discovery/containers/${name}.js`).then((m) => m.default)),
    ]);
    const { Button, Icon, provider: UI } = components;

    events.on('search/result', ({ result, request }) => {
      const total = result?.totalCount || 0;
      block.classList.toggle('is-empty', total === 0);
      const label = `${total} ${total === 1 ? 'resultado' : 'resultados'}`;
      info.textContent = request?.phrase ? `${label} para "${request.phrase}"` : label;
    }, { eager: true });

    await search({
      phrase,
      currentPage: parseInt(params.get('page'), 10) || 1,
      pageSize,
      sort: category ? [{ attribute: 'position', direction: 'DESC' }] : [],
      filter: [
        VISIBILITY,
        ...(category ? [{ attribute: 'categoryPath', eq: category }] : []),
      ],
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('product-list-page: search failed', e);
    });

    const addToCart = async (product) => {
      alert.className = 'product-list-page-alert';
      try {
        await initializeCart();
        const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
        await addProductsToCart([{ sku: product.sku, quantity: 1 }]);
        alert.classList.add('is-success');
        alert.textContent = `"${product.name}" foi adicionado ao carrinho.`;
      } catch (error) {
        alert.classList.add('is-error');
        alert.textContent = `Não foi possível adicionar ao carrinho: ${error.message}`;
      }
    };

    // products with options (size, color...) are configured on the product page
    const cartButton = (product) => {
      const host = document.createElement('div');
      host.className = 'product-list-page-card-action';
      const needsOptions = product.typename === 'ComplexProductView';
      UI.render(Button, {
        children: needsOptions ? 'Ver opções' : 'Adicionar ao carrinho',
        'aria-label': `${needsOptions ? 'Ver opções de' : 'Adicionar ao carrinho:'} ${product.name}`,
        icon: needsOptions ? undefined : Icon({ source: 'Cart' }),
        variant: 'primary',
        ...(needsOptions
          ? { href: getProductLink(product.sku) }
          : { onClick: () => addToCart(product), disabled: product.inStock === false }),
      })(host);
      return host;
    };

    await Promise.all([
      render.render(SortBy, {})(sort),
      render.render(Pagination, { onPageChange: () => window.scrollTo({ top: 0, behavior: 'smooth' }) })(pagination),
      UI.render(Button, {
        children: 'Filtros',
        icon: Icon({ source: 'Burger' }),
        variant: 'secondary',
        onClick: () => facets.classList.toggle('is-visible'),
      })(toggle),
      render.render(Facets, {})(facets),
      render.render(SearchResults, {
        routeProduct: (product) => getProductLink(product.sku),
        slots: {
          ProductActions: (ctx) => ctx.replaceWith(cartButton(ctx.product)),
        },
      })(list),
    ]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('product-list-page:', error);
    info.textContent = 'Não foi possível carregar os produtos no momento.';
  }
}
