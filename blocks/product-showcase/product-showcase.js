/*
 * Product showcase (vitrine): carousel of catalog products in the loja.sebrae.com.br style.
 * Authoring (key-value table):
 *   title    | heading above the carousel (the authored text itself becomes the <h2>)
 *   category | catalog category path (e.g. apparel) — used when no SKUs are given
 *   skus     | optional comma-separated SKUs, in display order
 *   limit    | max products (default 10)
 *   label    | card eyebrow, e.g. "Curso online / Marketing"
 */
import { readBlockConfig } from '../../scripts/aem.js';
import { CS_FETCH_GRAPHQL, initializeCommerce } from '../../scripts/commerce.js';
import { productCard } from '../../scripts/product-card.js';

const QUERY = `query Showcase($filter: [SearchClauseInput!], $size: Int) {
  productSearch(phrase: "", page_size: $size, filter: $filter) {
    items {
      productView {
        __typename sku name urlKey inStock
        images(roles: ["small_image"]) { url }
        ... on SimpleProductView { price { final { amount { value currency } } } }
        ... on ComplexProductView { priceRange { minimum { final { amount { value currency } } } } }
      }
    }
  }
}`;

const VISIBILITY = { attribute: 'visibility', in: ['Search', 'Catalog, Search'] };

const el = (tag, className, ...children) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  e.append(...children);
  return e;
};

async function fetchProducts({ category, skus, limit }) {
  const filter = [VISIBILITY];
  if (skus.length) filter.push({ attribute: 'sku', in: skus });
  else if (category) filter.push({ attribute: 'categoryPath', eq: category });
  const { data, errors } = await CS_FETCH_GRAPHQL.fetchGraphQl(QUERY, {
    variables: { filter, size: skus.length || limit },
  });
  if (errors?.length) throw new Error(errors[0].message);
  const products = (data?.productSearch?.items || [])
    // eslint-disable-next-line no-underscore-dangle
    .map(({ productView: p }) => ({ ...p, typename: p.__typename }));
  if (!skus.length) return products.slice(0, limit);
  // keep the authored order
  const bySku = (sku) => products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
  return skus.map(bySku).filter(Boolean);
}

function buildCarousel(block, track, count) {
  const dots = el('div', 'product-showcase-dots');
  const counter = el('span', 'product-showcase-counter');
  counter.setAttribute('aria-live', 'polite');
  const prev = el('button', 'product-showcase-prev');
  const next = el('button', 'product-showcase-next');
  [[prev, 'Anterior'], [next, 'Próximo']].forEach(([b, label]) => {
    b.type = 'button';
    b.setAttribute('aria-label', label);
  });
  const pager = el('div', 'product-showcase-pager', counter, prev, next);
  const nav = el('div', 'product-showcase-nav', dots, pager);

  const cardWidth = () => track.firstElementChild?.offsetWidth || 1;
  const perView = () => Math.max(1, Math.round(track.clientWidth / cardWidth()));
  const pages = () => Math.max(1, Math.ceil(count / perView()));
  const scrolledPages = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  const current = () => (atEnd() ? pages() - 1 : Math.min(pages() - 1, scrolledPages()));
  const go = (page) => {
    const index = Math.max(0, Math.min(pages() - 1, page)) * perView();
    track.children[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  const update = () => {
    const total = pages();
    const page = current();
    if (dots.children.length !== total) {
      dots.replaceChildren(...Array.from({ length: total }, (_, i) => {
        const dot = el('button', 'product-showcase-dot');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Página ${i + 1} de ${total}`);
        dot.addEventListener('click', () => go(i));
        return dot;
      }));
    }
    [...dots.children].forEach((d, i) => d.setAttribute('aria-current', i === page ? 'true' : 'false'));
    counter.textContent = `${page + 1} de ${total}`;
    prev.disabled = page === 0;
    next.disabled = page >= total - 1;
    nav.hidden = total < 2;
  };

  prev.addEventListener('click', () => go(current() - 1));
  next.addEventListener('click', () => go(current() + 1));
  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  }, { passive: true });
  new ResizeObserver(update).observe(track);
  block.append(nav);
  update();
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const rows = [...block.children];

  // the authored title cell becomes the heading (same text for humans and agents)
  const titleRow = rows.find((r) => r.children[0]?.textContent.trim().toLowerCase() === 'title');
  const heading = el('h2', 'product-showcase-title');
  const titleCell = titleRow?.children[1];
  if (titleCell) {
    titleCell.querySelectorAll(':scope > p').forEach((p) => p.replaceWith(...p.childNodes));
    heading.append(...titleCell.childNodes);
  }

  // authored rows stay in the DOM (hidden) so the block keeps its Universal Editor instrumentation
  const source = el('div', 'product-showcase-source', ...rows);
  source.hidden = true;
  const track = el('ul', 'product-showcase-track');
  track.setAttribute('aria-label', heading.textContent.trim() || 'Vitrine de produtos');
  block.replaceChildren(...(heading.textContent.trim() ? [heading] : []), track, source);

  const skus = (config.skus || '').split(',').map((s) => s.trim()).filter(Boolean);
  const limit = parseInt(config.limit, 10) || 10;
  const category = (config.category || '').trim().replace(/^\/|\/$/g, '');

  try {
    await initializeCommerce();
    const products = await fetchProducts({ category, skus, limit });
    if (!products.length) {
      track.replaceWith(el('p', 'product-showcase-empty', 'Nenhum produto encontrado para esta vitrine.'));
      return;
    }
    track.append(...products.map((p) => el('li', 'product-showcase-item', productCard(p, config.label))));
    buildCarousel(block, track, products.length);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('product-showcase:', error);
    track.replaceWith(el('p', 'product-showcase-empty', 'Não foi possível carregar os produtos no momento.'));
  }
}
