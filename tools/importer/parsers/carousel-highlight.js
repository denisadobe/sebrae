/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-highlight. Base: carousel. Source: https://sebrae.com.br/
 * Instance: .cmp-carousel (id="carousel-c4947e7534").
 *
 * The rendered DOM only holds content for the ACTIVE slide: the other .embla__slide
 * elements contain just an empty image placeholder, and images are lazy (no <img>).
 * The full slide data (5 teasers) lives in the AEM SPA model:
 *   <script id="initialData" type="application/json"> in <head>
 *   -> node with id === element.id -> ':itemsOrder' / ':items' (teaser: title, description, actions, :items.image.src)
 * Primary source: that JSON model. Fallback: iterate .embla__slide in the DOM.
 *
 * Output: one row per slide, 2 columns: [image (optional, '' if none) | h2 + description + CTA].
 * Images are kept as <img> with Scene7 URLs (DM transformer runs afterwards).
 * No sc-* hashed classes used.
 */
export default function parse(element, { document }) {
  const rows = slidesFromModel(element, document) || slidesFromDom(element, document);

  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = rows.map(({ image, content }) => [image || '', content]);
  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-highlight', cells });
  element.replaceWith(block);
}

function findCarouselModel(data, id) {
  let found = null;
  const walk = (node) => {
    if (found || !node || typeof node !== 'object') return;
    if (node[':itemsOrder'] && node[':items'] && (!id || node.id === id)) {
      const isCarousel = node.id === id || /carousel/i.test(node[':type'] || '');
      if (isCarousel) { found = node; return; }
    }
    Object.values(node).forEach(walk);
  };
  walk(data);
  return found;
}

function pageUrl(document) {
  const candidates = [];
  try { candidates.push(window.location.href); } catch (e) { /* no window */ }
  candidates.push(document.baseURI, document.URL);
  return candidates.find((u) => typeof u === 'string' && /^https?:/.test(u)) || null;
}

/**
 * Load the AEM SPA model. html2md's preprocessing strips <script> elements, so the
 * in-document #initialData is not always available to parsers. Fallback: synchronously
 * re-fetch the (same-origin) page HTML and extract the #initialData JSON from it.
 */
function loadPageModel(document) {
  const script = document.getElementById('initialData');
  if (script && script.textContent.trim()) {
    try { return JSON.parse(script.textContent); } catch (e) { /* fall through */ }
  }
  const url = pageUrl(document);
  if (!url || typeof XMLHttpRequest === 'undefined') return null;
  const cache = (globalThis.__sebraeModelCache = globalThis.__sebraeModelCache || {});
  if (url in cache) return cache[url];
  cache[url] = null;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    if (xhr.status >= 200 && xhr.status < 300) {
      const m = xhr.responseText.match(/<script[^>]*id=["']initialData["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) cache[url] = JSON.parse(m[1]);
    }
  } catch (e) { /* network/CORS failure -> DOM fallback */ }
  return cache[url];
}

function slidesFromModel(element, document) {
  if (!element.id) return null;
  const data = loadPageModel(document);
  if (!data) return null;
  const model = findCarouselModel(data, element.id);
  if (!model) return null;

  const rows = [];
  model[':itemsOrder'].forEach((key) => {
    const item = model[':items'][key];
    if (!item) return;
    const content = [];
    if (item.title) {
      const tag = /^h[1-6]$/.test(item.titleType || '') ? item.titleType : 'h2';
      const h = document.createElement(tag);
      h.textContent = item.title;
      content.push(h);
    }
    if (item.description) {
      const tmp = document.createElement('div');
      tmp.innerHTML = item.description;
      const ps = Array.from(tmp.querySelectorAll('p')).filter((p) => p.textContent.trim());
      if (ps.length) content.push(...ps);
      else if (tmp.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = tmp.textContent.trim();
        content.push(p);
      }
    }
    (item.actionsEnabled !== false ? item.actions || [] : []).forEach((action) => {
      if (!action || !action.url || !action.title) return;
      const a = document.createElement('a');
      a.href = action.url;
      a.textContent = action.title;
      const p = document.createElement('p');
      p.append(a);
      content.push(p);
    });

    let image = null;
    const imgModel = item[':items'] && item[':items'].image;
    if (imgModel && imgModel.src && !item.hideImageContainer) {
      image = document.createElement('img');
      image.src = imgModel.src;
      image.alt = imgModel.decorative ? '' : (imgModel.alt || '');
    }

    if (content.length || image) rows.push({ image, content });
  });
  return rows.length ? rows : null;
}

function slidesFromDom(element, document) {
  let slides = Array.from(element.querySelectorAll('.embla__slide'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.cmp-carousel__item'));

  const rows = [];
  slides.forEach((slide) => {
    const content = [];
    const title = slide.querySelector('.teaser-carousel__title, .cmp-teaser__title-text') || slide.querySelector('h1, h2, h3');
    if (title && title.textContent.trim()) {
      const h = document.createElement('h2');
      h.textContent = title.textContent.trim();
      content.push(h);
    }
    const desc = slide.querySelector('.teaser-carousel__description, .cmp-teaser__description');
    if (desc && desc.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.trim();
      content.push(p);
    }
    const ctaSrc = slide.querySelector('.teaser-carousel__action a[href], .cmp-teaser__action-link');
    if (ctaSrc && ctaSrc.textContent.trim()) {
      const a = document.createElement('a');
      a.href = ctaSrc.getAttribute('href');
      a.textContent = ctaSrc.textContent.trim();
      const p = document.createElement('p');
      p.append(a);
      content.push(p);
    }
    let image = null;
    const img = slide.querySelector('.teaser-carousel__image-wrapper img, .cmp-image img');
    if (img && img.getAttribute('src') && !img.getAttribute('src').startsWith('data:')) {
      image = document.createElement('img');
      image.src = img.getAttribute('src');
      image.alt = img.getAttribute('alt') || '';
    }
    if (content.length || image) rows.push({ image, content });
  });
  return rows;
}
