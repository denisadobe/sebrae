/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-tagged. Base: cards. Source: https://sebrae.com.br/
 * Instance: .ps-featured-card > div:nth-of-type(2) (audience cards: Estudantes e professores / Agentes Públicos).
 * Each card = .ps-featured-card-text (.ps-featured-card-tag, empty <h3>, .ps-featured-card-text-description p, a CTA)
 *             + .ps-featured-card-img (lazy image placeholder, no <img> in DOM).
 * Output: one row per card, 2 cells: [tag | text + p>a CTA] (UE fields: tag, text).
 * Iterates .ps-featured-card-text block wrappers (not anchors); no sc-* hashed classes used.
 */
export default function parse(element, { document }) {
  let cards = Array.from(element.querySelectorAll('.ps-featured-card-text'));
  if (!cards.length) cards = Array.from(element.querySelectorAll('.ps-featured-card-tag')).map((t) => t.parentElement);

  const cells = [];
  cards.forEach((card) => {
    const content = [];

    const tagEl = card.querySelector('.ps-featured-card-tag');
    const tag = tagEl ? tagEl.textContent.trim() : '';

    // Heading is empty in source; keep it only when it has text.
    const heading = card.querySelector('h1, h2, h3, h4');
    if (heading && heading.textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = heading.textContent.trim();
      content.push(h);
    }

    const desc = card.querySelector('.ps-featured-card-text-description');
    if (desc) {
      const ps = Array.from(desc.querySelectorAll('p')).filter((p) => p.textContent.trim());
      if (ps.length) {
        ps.forEach((p) => {
          const np = document.createElement('p');
          np.innerHTML = p.innerHTML;
          content.push(np);
        });
      } else if (desc.textContent.trim()) {
        const np = document.createElement('p');
        np.textContent = desc.textContent.trim();
        content.push(np);
      }
    }

    const ctaSrc = card.querySelector(':scope > a[href]') || card.querySelector('a[href]');
    if (ctaSrc) {
      const text = ctaSrc.textContent.replace(/\s+/g, ' ').trim();
      if (text) {
        const a = document.createElement('a');
        a.href = ctaSrc.getAttribute('href');
        a.textContent = text;
        const p = document.createElement('p');
        p.append(a);
        content.push(p);
      }
    }

    if (content.length || tag) cells.push([tag, content]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-tagged', cells });
  element.replaceWith(block);
}
