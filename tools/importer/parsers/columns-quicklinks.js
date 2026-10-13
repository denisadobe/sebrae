/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-quicklinks. Base: columns. Source: https://sebrae.com.br/
 * Source structure: ul.cmp-list.hero-banner-primary > li > a.cmp-list__item-link > span (text + arrow svg img).
 * Output: one row per quick link, one cell each (container model: each link is a UE item).
 * Iterates the <li> wrappers (not the anchors) to stay immune to inline-element merging.
 * Decorative arrow icons (data:image/svg+xml) are dropped.
 */
export default function parse(element, { document }) {
  let items = Array.from(element.querySelectorAll(':scope > li'));
  if (!items.length) items = Array.from(element.querySelectorAll('li'));

  const rows = [];
  items.forEach((li) => {
    const source = li.querySelector('a.cmp-list__item-link') || li.querySelector('a[href]');
    if (!source) return;
    const text = source.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const link = document.createElement('a');
    link.href = source.getAttribute('href');
    link.textContent = text;
    const p = document.createElement('p');
    p.append(link);
    rows.push([p]);
  });

  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = rows;
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-quicklinks', cells });
  element.replaceWith(block);
}
