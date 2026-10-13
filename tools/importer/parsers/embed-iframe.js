/* eslint-disable */
/* global WebImporter */
/**
 * Parser for embed-iframe. Base: embed. Source: https://sebrae.com.br/
 * Instance: .embed__wrapper (id="embed-6988926ac4") > div > iframe[src="https://cloud.cliente.sebrae.com.br/seuinteressev2"].
 * Output: one row, one cell with a link to the embedded page.
 * If the iframe declares an explicit numeric height attribute, it is appended as a second
 * cell (block JS reads any numeric cell as the iframe height in px).
 */
export default function parse(element, { document }) {
  const iframe = element.querySelector('iframe[src]');
  const src = iframe
    ? (iframe.getAttribute('src') || iframe.getAttribute('data-src'))
    : (element.querySelector('a[href]')?.getAttribute('href'));

  if (!src || src === 'about:blank') {
    element.replaceWith(...element.childNodes);
    return;
  }

  const link = document.createElement('a');
  link.href = src;
  link.textContent = src;

  const row = [link];
  const height = iframe && iframe.getAttribute('height');
  if (height && /^\d+(px)?$/.test(height.trim())) row.push(String(parseInt(height, 10)));

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'embed-iframe', cells });
  element.replaceWith(block);
}
