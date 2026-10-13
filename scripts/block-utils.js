import { decorateIcons, toClassName } from './aem.js';
import { optimizePicture } from './dm-images.js';

/**
 * Decorates a card icon cell. Authors either place an image, or type an icon
 * name (picked from a list in Universal Editor) that maps to /icons/<name>.svg.
 * @param {Element} cell the icon cell
 * @param {number} width rendition width for authored images
 * @returns {boolean} true when the cell holds an icon or image
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateIconCell(cell, width = 160) {
  if (!cell) return false;
  const img = cell.querySelector('picture > img');
  if (img) {
    optimizePicture(img, false, [{ width: String(width) }]);
    return true;
  }
  if (cell.querySelector('span.icon')) {
    decorateIcons(cell);
    return true;
  }
  const name = toClassName(cell.textContent.trim().replace(/^:|:$/g, ''));
  if (!name) return false;
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  cell.replaceChildren(span);
  decorateIcons(cell);
  return true;
}
