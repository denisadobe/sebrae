import { optimizePicture } from '../../scripts/dm-images.js';

/**
 * Hero Banner: split-panel variant of the boilerplate hero.
 * Authored as rows of single cells: [picture] then [heading + text + CTA]
 * (a single cell holding both, or two cells in one row, also work).
 * Renders text left and image right on desktop; stacks on mobile.
 * Authored cells are kept (not rebuilt) so Universal Editor instrumentation survives.
 * @param {Element} block
 */
export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const imageCell = cells.find((cell) => cell.querySelector('picture') && !cell.textContent.trim());
  const textCells = cells.filter((cell) => cell !== imageCell && (cell.textContent.trim() || cell.querySelector('picture')));

  const inner = document.createElement('div');
  inner.className = 'hero-banner-inner';

  const [content, ...extra] = textCells;
  if (content) {
    // a picture authored together with the text is pulled out into the media column
    const inlinePicture = !imageCell ? content.querySelector('picture') : null;
    extra.forEach((cell) => content.append(...cell.childNodes));
    content.className = 'hero-banner-content';
    inner.append(content);
    if (inlinePicture) {
      const media = document.createElement('div');
      media.className = 'hero-banner-image';
      const wrapper = inlinePicture.parentElement;
      media.append(inlinePicture);
      if (wrapper && wrapper.tagName === 'P' && !wrapper.textContent.trim()) wrapper.remove();
      inner.append(media);
    }
  }

  if (imageCell) {
    imageCell.className = 'hero-banner-image';
    inner.append(imageCell);
  }

  const img = inner.querySelector('.hero-banner-image picture > img');
  if (img) optimizePicture(img, true, [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }]);
  else block.classList.add('hero-banner-no-image');

  block.replaceChildren(inner);
}
