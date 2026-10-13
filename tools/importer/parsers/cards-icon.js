/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-icon. Base: cards. Source: https://sebrae.com.br/
 * Instances:
 *  - .ps-info-cards > div:nth-of-type(2)       (Comece / Gerencie / Expanda — description + link list + "Mostrar tudo")
 *  - .ps-highlight-carousel > div:nth-of-type(2) (Cursos / Eventos / Conteúdos inside embla viewport)
 * Each card = .card-container > .card-main-content (.icon-wrapper img + .card-content .cmp-teaser__content)
 *             + .ps-card-footer a (CTA).
 * Output: one row per card, 2 columns: [icon img (or empty) | heading + description + ul of links + CTA].
 * Icons are <img> (data: SVG) in source; kept as <img>. Inline <svg> icons leave the cell empty.
 * Iterates the .card-container block wrappers, never anchors; no sc-* hashed classes used.
 */
// Inline <svg> icons on the source are exported to /icons/<name>.svg; the icon cell
// carries the icon name (Universal Editor "Ícone" select), resolved by the block JS.
const ICONS_BY_TITLE = {
  comece: 'comece',
  gerencie: 'gerencie',
  expanda: 'expanda',
  cursos: 'cursos',
  eventos: 'eventos',
  'conteúdos': 'conteudos',
  'promoções para conquistar o cliente': 'promocoes',
  'planilha controle de estoque': 'planilha',
  'como definir o preço de venda': 'preco',
  'como vender mais e melhor': 'vendas',
};

export default function parse(element, { document }) {
  let cards = Array.from(element.querySelectorAll('.card-container'));
  if (!cards.length) cards = Array.from(element.querySelectorAll('.cmp-teaser')).map((t) => t.closest('.card-main-content')?.parentElement || t);

  const cells = [];

  cards.forEach((card) => {
    // Icon cell
    let iconCell = '';
    const iconImg = card.querySelector('.icon-wrapper img, .card-main-content > div:first-child img');
    // Live page renders icons as inline <svg> (scraped DOM shows data: URIs, which html2md drops).
    // Only real-URL <img> icons are kept; otherwise the icon cell stays empty.
    const iconSrc = iconImg && iconImg.getAttribute('src');
    if (iconSrc && !iconSrc.startsWith('data:')) {
      const img = document.createElement('img');
      img.src = iconSrc;
      img.alt = iconImg.getAttribute('alt') || '';
      iconCell = img;
    }

    // Body cell
    const body = [];
    const titleEl = card.querySelector('.cmp-teaser__title-text, .cmp-teaser__title h2, .cmp-teaser__title h3')
      || card.querySelector('h1, h2, h3, h4');
    if (titleEl && titleEl.textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = titleEl.textContent.trim();
      body.push(h);
    }

    const desc = card.querySelector('.description-content') || card.querySelector('.cmp-teaser__description');
    if (desc) {
      const paragraphs = Array.from(desc.querySelectorAll('p'));
      const links = [];
      paragraphs.forEach((p) => {
        const text = p.textContent.replace(/ /g, ' ').trim();
        if (!text) return;
        const anchors = p.querySelectorAll('a[href]');
        const anchorText = Array.from(anchors).map((a) => a.textContent).join('').replace(/ /g, ' ').trim();
        if (anchors.length === 1 && anchorText === text) {
          const a = document.createElement('a');
          a.href = anchors[0].getAttribute('href');
          a.textContent = text;
          links.push(a);
        } else {
          if (links.length) {
            body.push(buildList(document, links.splice(0)));
          }
          const np = document.createElement('p');
          np.innerHTML = p.innerHTML;
          body.push(np);
        }
      });
      if (links.length) body.push(buildList(document, links));
    }

    const ctaSrc = card.querySelector('.ps-card-footer a[href], .card-button');
    if (ctaSrc) {
      const text = ctaSrc.textContent.replace(/\s+/g, ' ').trim();
      if (text) {
        const a = document.createElement('a');
        a.href = ctaSrc.getAttribute('href');
        a.textContent = text;
        const p = document.createElement('p');
        p.append(a);
        body.push(p);
      }
    }

    if (!body.length) return;
    if (!iconCell && titleEl) iconCell = ICONS_BY_TITLE[titleEl.textContent.trim().toLowerCase()] || '';
    cells.push([iconCell, body]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-icon', cells });
  element.replaceWith(block);
}

function buildList(document, links) {
  const ul = document.createElement('ul');
  links.forEach((a) => {
    const li = document.createElement('li');
    li.append(a);
    ul.append(li);
  });
  return ul;
}
