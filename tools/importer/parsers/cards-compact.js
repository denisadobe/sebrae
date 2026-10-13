/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-compact. Base: cards. Source: https://sebrae.com.br/
 * Instance: .side-icons > div:nth-of-type(2) (Black Friday cards).
 * Each card = .card-container > .card-main-content (.icon-wrapper icon + .cmp-teaser__content title/description)
 *             + .ps-card-footer a (CTA, e.g. "Ler artigo").
 * Output: one row per card, 2 columns: [icon img (or empty) | heading + description + CTA link].
 * Live icons are inline <svg> (scraped as data: URIs) -> icon cell left empty unless a real-URL <img>.
 * Iterates .card-container wrappers (not anchors); no sc-* hashed classes used.
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
  if (!cards.length) cards = Array.from(element.querySelectorAll('.cmp-teaser'));

  const cells = [];
  cards.forEach((card) => {
    let iconCell = '';
    const iconImg = card.querySelector('.icon-wrapper img');
    const iconSrc = iconImg && iconImg.getAttribute('src');
    if (iconSrc && !iconSrc.startsWith('data:')) {
      const img = document.createElement('img');
      img.src = iconSrc;
      img.alt = iconImg.getAttribute('alt') || '';
      iconCell = img;
    }

    const body = [];
    const titleEl = card.querySelector('.cmp-teaser__title-text') || card.querySelector('h1, h2, h3, h4');
    if (titleEl && titleEl.textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = titleEl.textContent.trim();
      body.push(h);
    }

    const desc = card.querySelector('.description-content, .cmp-teaser__description');
    if (desc) {
      const ps = Array.from(desc.querySelectorAll('p')).filter((p) => p.textContent.trim());
      if (ps.length) {
        ps.forEach((p) => {
          const np = document.createElement('p');
          np.innerHTML = p.innerHTML;
          body.push(np);
        });
      } else if (desc.textContent.trim()) {
        const np = document.createElement('p');
        np.textContent = desc.textContent.trim();
        body.push(np);
      }
    }

    const ctaSrc = card.querySelector('.ps-card-footer a[href]') || card.closest('a[href]');
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

    if (!iconCell && titleEl) iconCell = ICONS_BY_TITLE[titleEl.textContent.trim().toLowerCase()] || '';
    if (body.length) cells.push([iconCell, body]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-compact', cells });
  element.replaceWith(block);
}
