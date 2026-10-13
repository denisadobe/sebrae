import { optimizePicture } from '../../scripts/dm-images.js';

/**
 * CTA Banner: call-to-action panel with heading, text, buttons and an optional image.
 * Authored as one row: [image (optional) | heading + text + links]. Color options
 * (lime | navy | blue) come from the block classes.
 * Authored cells are kept so Universal Editor instrumentation survives.
 * @param {Element} block
 */
export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const imageCell = cells.find((c) => c.querySelector('picture') && !c.textContent.trim());
  const content = cells.find((c) => c !== imageCell);
  const inner = document.createElement('div');
  inner.className = 'cta-banner-inner';
  if (content) {
    content.className = 'cta-banner-content';
    content.querySelectorAll('p > a:only-child').forEach((a, i) => {
      a.classList.add('cta-banner-button', i ? 'cta-banner-button-secondary' : 'cta-banner-button-primary');
      a.parentElement.classList.add('cta-banner-actions');
    });
    inner.append(content);
  }
  if (imageCell) {
    imageCell.className = 'cta-banner-image';
    const img = imageCell.querySelector('picture > img');
    if (img) optimizePicture(img, false, [{ width: '750' }]);
    inner.append(imageCell);
  } else {
    block.classList.add('cta-banner-no-image');
  }
  block.replaceChildren(inner);
}
