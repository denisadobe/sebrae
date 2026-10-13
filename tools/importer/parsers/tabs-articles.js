/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-articles. Base: tabs. Source: https://sebrae.com.br/
 * Instance: [id^="panelcontainer"] (id="panelcontainer-d68041b93e").
 *
 * Rendered DOM: tab buttons (span.tabs__label__wrapper) + only the ACTIVE panel's content;
 * article cards have no hrefs and lazy images (no <img>); the Ebooks panel is empty.
 * Full data lives in the AEM SPA model (<script id="initialData"> in <head>, node id === element.id):
 *   :items[tab]['cq:panelTitle'] -> label
 *   ...card_carousel_descri[':items'].title.text -> intro rich text (h2 + p + link)
 *   ...card_carousel_descri[':items'].list.items[] -> { title, url, description, image, tag, format }
 * html2md strips <script> elements, so the model is re-fetched synchronously (same origin) if absent.
 * Fallback: DOM (labels from buttons, content from rendered panels; empty panels still emit a row).
 *
 * Output: one row per tab, 2 columns: [label | h3 + intro p + link + ul of article items].
 * Each article li: img (Scene7) + category + "Format | Title" link + description.
 * No sc-* hashed classes used.
 */
export default function parse(element, { document }) {
  const rows = tabsFromModel(element, document) || tabsFromDom(element, document);

  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = rows.map(({ label, content }) => [label, content.length ? content : '']);
  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-articles', cells });
  element.replaceWith(block);
}

/* ---------- AEM SPA model ---------- */

function pageUrl(document) {
  const candidates = [];
  try { candidates.push(window.location.href); } catch (e) { /* no window */ }
  candidates.push(document.baseURI, document.URL);
  return candidates.find((u) => typeof u === 'string' && /^https?:/.test(u)) || null;
}

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
  } catch (e) { /* network failure -> DOM fallback */ }
  return cache[url];
}

function findById(data, id) {
  let found = null;
  const walk = (node) => {
    if (found || !node || typeof node !== 'object') return;
    if (node.id === id && node[':itemsOrder']) { found = node; return; }
    Object.values(node).forEach(walk);
  };
  walk(data);
  return found;
}

function findByType(node, re, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (typeof node[':type'] === 'string' && re.test(node[':type'])) acc.push(node);
  Object.values(node).forEach((v) => findByType(v, re, acc));
  return acc;
}

function tabsFromModel(element, document) {
  if (!element.id) return null;
  const data = loadPageModel(document);
  if (!data) return null;
  const model = findById(data, element.id);
  if (!model) return null;

  const rows = [];
  model[':itemsOrder'].forEach((key) => {
    const tab = model[':items'][key];
    if (!tab) return;
    const label = (tab['cq:panelTitle'] || tab.title || '').trim();
    const content = [];

    findByType(tab, /components\/content\/text$/).forEach((text) => {
      if (text.text) content.push(...richText(document, text.text));
    });

    findByType(tab, /components\/content\/list$/).forEach((list) => {
      const items = Array.isArray(list.items) ? list.items : [];
      if (!items.length) return;
      const ul = document.createElement('ul');
      items.forEach((item) => {
        const li = document.createElement('li');
        if (item.image) {
          const img = document.createElement('img');
          img.src = item.image;
          img.alt = (item.title || '').trim();
          li.append(img);
        }
        if (item.tag) {
          const p = document.createElement('p');
          p.textContent = item.tag;
          li.append(p);
        }
        const titleText = [item.format, (item.title || '').trim()].filter(Boolean).join(' | ');
        if (titleText) {
          const p = document.createElement('p');
          if (item.url) {
            const a = document.createElement('a');
            a.href = item.url;
            a.textContent = titleText;
            p.append(a);
          } else {
            p.textContent = titleText;
          }
          li.append(p);
        }
        if (item.description) {
          const tmp = document.createElement('div');
          tmp.innerHTML = item.description;
          const p = document.createElement('p');
          p.textContent = tmp.textContent.replace(/ /g, ' ').trim();
          if (p.textContent) li.append(p);
        }
        if (li.childNodes.length) ul.append(li);
      });
      if (ul.children.length) content.push(ul);
    });

    if (label || content.length) rows.push({ label: label || `Tab ${rows.length + 1}`, content });
  });
  return rows.length ? rows : null;
}

/**
 * Convert intro rich text to block content: h2 -> h3 (section heading is h1/h2 outside the block),
 * <br>-separated links inside a paragraph are split out into their own paragraph.
 */
function richText(document, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const out = [];
  Array.from(tmp.children).forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName)) {
      const h = document.createElement('h3');
      h.textContent = el.textContent.trim();
      if (h.textContent) out.push(h);
      return;
    }
    if (el.tagName === 'P') {
      const links = Array.from(el.querySelectorAll('a[href]'));
      const linkText = links.map((a) => a.textContent).join('').trim();
      const fullText = el.textContent.replace(/ /g, ' ').trim();
      if (!fullText) return;
      if (links.length && linkText !== fullText) {
        // text + link in one paragraph -> separate text paragraph and link paragraph
        const textP = document.createElement('p');
        textP.textContent = fullText.replace(linkText, '').trim();
        if (textP.textContent) out.push(textP);
        links.forEach((a) => {
          const p = document.createElement('p');
          const na = document.createElement('a');
          na.href = a.getAttribute('href');
          na.textContent = a.textContent.trim();
          p.append(na);
          out.push(p);
        });
        return;
      }
      const p = document.createElement('p');
      p.innerHTML = el.innerHTML;
      p.querySelectorAll('a[title]').forEach((a) => a.removeAttribute('title'));
      out.push(p);
      return;
    }
    out.push(el);
  });
  return out;
}

/* ---------- DOM fallback ---------- */

function tabsFromDom(element, document) {
  const buttons = Array.from(element.querySelectorAll('button[id^="tab-"], [role="tab"]'))
    .filter((b, i, arr) => arr.indexOf(b) === i);
  const rows = [];
  buttons.forEach((btn, i) => {
    const labelEl = btn.querySelector('.tabs__label__wrapper') || btn;
    const label = labelEl.textContent.replace(/\s+/g, ' ').trim();
    if (!label) return;
    const panelId = (btn.id || '').replace(/^tab-/, 'panel-');
    const panel = (panelId && element.querySelector(`[id="${panelId}"]`))
      || element.querySelectorAll('[id^="panel-"], [role="tabpanel"]')[i];
    const content = [];
    if (panel) {
      const intro = panel.querySelector('.cmp-text');
      if (intro) content.push(...richText(document, intro.innerHTML));
      const cards = Array.from(panel.querySelectorAll('.ps-content-card-vertical'));
      if (cards.length) {
        const ul = document.createElement('ul');
        cards.forEach((card) => {
          const li = document.createElement('li');
          const img = card.querySelector('.ps-content-card-media img');
          if (img && img.getAttribute('src') && !img.getAttribute('src').startsWith('data:')) {
            const ni = document.createElement('img');
            ni.src = img.getAttribute('src');
            ni.alt = img.getAttribute('alt') || '';
            li.append(ni);
          }
          const titleEl = card.querySelector('.ps-content-card-title');
          const media = card.querySelector('.ps-content-card-media');
          const tagText = Array.from(card.querySelectorAll('div'))
            .filter((d) => !d.children.length && d !== titleEl && !(media && media.contains(d)))
            .map((d) => d.textContent.trim())
            .find(Boolean);
          if (tagText) {
            const p = document.createElement('p');
            p.textContent = tagText;
            li.append(p);
          }
          if (titleEl) {
            const p = document.createElement('p');
            const text = titleEl.textContent.replace(/\s+/g, ' ').replace(/ /g, ' ').trim();
            const href = card.querySelector('a[href]')?.getAttribute('href');
            if (href) {
              const a = document.createElement('a');
              a.href = href;
              a.textContent = text;
              p.append(a);
            } else {
              p.textContent = text;
            }
            li.append(p);
          }
          if (li.childNodes.length) ul.append(li);
        });
        if (ul.children.length) content.push(ul);
      }
    }
    rows.push({ label, content });
  });
  return rows;
}
