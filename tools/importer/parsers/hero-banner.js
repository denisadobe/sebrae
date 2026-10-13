/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-banner. Base: hero. Source: https://sebrae.com.br/
 * Source structure: AEM teaser (.cmp-teaser) with .cmp-teaser__image img and
 * .cmp-teaser__content (title, description, action link).
 * Output (hero convention, 1 column): row 1 = image (optional), row 2 = heading + text + CTA.
 * Never selects styled-components hashed classes (sc-*).
 */
export default function parse(element, { document }) {
  const teaser = element.querySelector('.cmp-teaser') || element;

  const image = teaser.querySelector('.cmp-teaser__image img, .cmp-image img, img');

  const heading = teaser.querySelector(
    '.cmp-teaser__title-text, .cmp-teaser__title h1, .cmp-teaser__title h2, .cmp-teaser__title h3',
  ) || teaser.querySelector('h1, h2, h3');

  const descContainer = teaser.querySelector('.cmp-teaser__description');
  const descriptions = descContainer
    ? Array.from(descContainer.querySelectorAll('p')).filter((p) => p.textContent.trim())
    : [];
  if (descContainer && !descriptions.length && descContainer.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = descContainer.textContent.trim();
    descriptions.push(p);
  }

  const ctas = Array.from(teaser.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a'))
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .map((a) => {
      const link = document.createElement('a');
      link.href = a.getAttribute('href') || '#';
      link.textContent = a.textContent.trim();
      const p = document.createElement('p');
      p.append(link);
      return p;
    });

  if (!heading && !descriptions.length && !image) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (image) cells.push([image]);

  const contentCell = [];
  if (heading) {
    // The hero carries the page's single h1 (section titles are demoted to h2 in cleanup).
    const h = document.createElement('h1');
    h.textContent = heading.textContent.trim();
    contentCell.push(h);
  }
  contentCell.push(...descriptions, ...ctas);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}
