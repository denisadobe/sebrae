/*
 * Universal Editor (Author Bus) behaviors. Loaded by scripts/scripts.js only on *.ue.da.live.
 * Blocks keep their own instrumentation (see scripts/ue-utils.js); this file makes
 * interactive blocks react to what the author selects in the editor.
 */
import { showSlide } from '../../blocks/carousel-highlight/carousel-highlight.js';
import { showTab } from '../../blocks/tabs-articles/tabs-articles.js';

const setupUEEventHandlers = () => {
  // when an image is swapped in the editor, drop stale responsive sources
  document.body.addEventListener('aue:content-patch', ({ detail: { patch, request } }) => {
    let element = document.querySelector(`[data-aue-resource="${request.target.resource}"]`);
    if (element && element.getAttribute('data-aue-prop') !== patch.name) element = element.querySelector(`[data-aue-prop='${patch.name}']`);
    if (element?.getAttribute('data-aue-type') !== 'media') return;

    const picture = element.tagName === 'IMG' ? element.closest('picture') : element;
    picture?.querySelectorAll('source').forEach((source) => source.remove());
    picture?.querySelector('img')?.removeAttribute('srcset');
  });

  // bring the selected item into view inside carousels and tabs
  document.body.addEventListener('aue:ui-select', ({ detail }) => {
    const resource = detail?.resource;
    if (!resource) return;
    const element = document.querySelector(`[data-aue-resource="${resource}"]`);
    if (!element) return;
    const blockEl = element.parentElement?.closest('.block[data-aue-resource]');
    if (!blockEl) return;

    if (blockEl.classList.contains('carousel-highlight')) {
      const slide = element.closest('.carousel-highlight-slide');
      if (slide) showSlide(blockEl, parseInt(slide.dataset.slideIndex, 10));
    } else if (blockEl.classList.contains('tabs-articles')) {
      const panel = element.closest('[role=tabpanel]')
        || blockEl.querySelector(`#${element.getAttribute('aria-controls')}`);
      if (panel) showTab(blockEl, panel);
    }
  });
};

export default () => {
  setupUEEventHandlers();
};
