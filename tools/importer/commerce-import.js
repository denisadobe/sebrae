/* eslint-disable */
/* global WebImporter */

/**
 * Commerce import script (PDP). Produces a thin shell document: the product-details block
 * carries only the SKU — product data (gallery, price, options...) loads at runtime from the
 * Adobe Commerce catalog via the PDP drop-in. Standard content around it (cards) is kept.
 * Source: Adobe's reference storefront (aem-boilerplate-commerce) product pages.
 */

const PDP_BLOCK = 'product-details';
const SKU_FIELD = 'defaultSku';

// SKU priority: JSON-LD Product.sku → URL /products/{url-key}/{sku} → data attributes
function getSku(document, url) {
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return null; } })
    .find((d) => d && d['@type'] === 'Product');
  if (ld && ld.sku) return String(ld.sku);
  const fromUrl = new URL(url).pathname.match(/\/products\/[\w-]+\/([\w-]+)$/);
  if (fromUrl) return fromUrl[1].toUpperCase();
  const el = document.querySelector('[data-sku], [data-product-sku]');
  if (el) return el.dataset.sku || el.dataset.productSku;
  console.warn(`⚠️ ${SKU_FIELD} could not be detected — enter it manually in commerce-templates.json`);
  return '';
}

// Standard block: cards (bold title + text per card) — selector verified in cleaned.html
function parseCards(document) {
  const el = document.querySelector('.cards-wrapper .cards, .cards');
  if (!el) {
    console.warn('⚠️ parseCards: .cards not found in document');
    return null;
  }
  const rows = [...el.querySelectorAll(':scope > ul > li, :scope > div')].map((card) => {
    const body = card.querySelector('.cards-card-body') || card.lastElementChild || card;
    const cell = document.createElement('div');
    [...body.querySelectorAll(':scope > p, :scope > div > p')].forEach((p) => cell.append(p.cloneNode(true)));
    return [cell];
  }).filter(([cell]) => cell.textContent.trim());
  if (!rows.length) return null;
  return WebImporter.DOMUtils.createTable([['Cards'], ...rows], document);
}

function metaContent(document, name) {
  const m = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  return m ? m.content : '';
}

export default {
  transform: ({ document, url }) => {
    const main = document.body;

    // STEP 1: extract everything while the DOM is intact
    const sku = getSku(document, url);
    const cards = parseCards(document);
    const title = (document.querySelector('title')?.textContent || '').trim() || metaContent(document, 'og:title');
    const description = metaContent(document, 'description') || metaContent(document, 'og:description');

    const productBlock = WebImporter.DOMUtils.createTable([
      ['Product Details'],
      [SKU_FIELD, sku],
    ], document);

    const metaRows = [['Metadata']];
    if (title) metaRows.push(['Title', title]);
    if (description) metaRows.push(['Description', description]);
    if (sku) metaRows.push(['sku', sku]);
    const metadata = WebImporter.DOMUtils.createTable(metaRows, document);

    // STEP 2: clear
    main.innerHTML = '';

    // STEP 3: rebuild (sections separated by <hr>) — commerce block, then standard content
    main.append(productBlock);
    if (cards) main.append(document.createElement('hr'), cards);

    // STEP 4: metadata (last section)
    main.append(document.createElement('hr'), metadata);

    const rawPath = new URL(url).pathname.replace(/\.html?$/i, '').replace(/\/+$/, '') || '/';
    return [{
      element: main,
      path: WebImporter.FileUtils.sanitizePath(rawPath),
      report: { sku, blocks: [PDP_BLOCK, cards ? 'cards' : null].filter(Boolean) },
    }];
  },
};
