import { optimizePicture } from '../../scripts/dm-images.js';
import { moveInstrumentation } from '../../scripts/ue-utils.js';

/**
 * Carousel Highlight: text-forward variant of the block-collection carousel.
 * Each row = one slide: [image | heading + text + CTA] (image cell optional).
 * Replaces dot indicators with a "1 de N" counter next to prev/next buttons.
 */

const LABELS = {
  roleDescription: 'Carrossel',
  controls: 'Controles do carrossel',
  previous: 'Slide anterior',
  next: 'Próximo slide',
  of: 'de',
};

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;
  const slides = block.querySelectorAll('.carousel-highlight-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) link.setAttribute('tabindex', '-1');
      else link.removeAttribute('tabindex');
    });
  });

  const current = block.querySelector('.carousel-highlight-counter-current');
  if (current) current.textContent = slideIndex + 1;
}

/**
 * Scrolls the slides track so the given slide sits centered (neighbours peek on both sides).
 */
function centerSlide(slidesWrapper, slide, behavior = 'smooth') {
  if (!slidesWrapper || !slide) return;
  const left = slide.offsetLeft - slidesWrapper.offsetLeft
    - (slidesWrapper.clientWidth - slide.offsetWidth) / 2;
  slidesWrapper.scrollTo({ top: 0, left, behavior });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-highlight-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  centerSlide(block.querySelector('.carousel-highlight-slides'), activeSlide);
  updateActiveSlide(block, realSlideIndex);
}

/**
 * Decorative, non-interactive copy of a slide image used at the track edges so the
 * first/last slides have a peeking neighbour (the source carousel loops).
 * Editor instrumentation is stripped so only the real slides are editable.
 */
function createEdgeClone(slide) {
  const image = slide.querySelector('.carousel-highlight-slide-image');
  if (!image) return null;
  const clone = document.createElement('li');
  clone.className = 'carousel-highlight-slide-clone';
  clone.setAttribute('aria-hidden', 'true');
  clone.inert = true;
  const imageCopy = image.cloneNode(true);
  [imageCopy, ...imageCopy.querySelectorAll('*')].forEach((el) => {
    [...el.attributes]
      .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-') || name === 'id')
      .forEach(({ name }) => el.removeAttribute(name));
  });
  imageCopy.querySelectorAll('img').forEach((img) => { img.alt = ''; });
  clone.append(imageCopy);
  return clone;
}

function bindEvents(block) {
  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-highlight-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-highlight-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-highlight-slide');

  moveInstrumentation(row, slide);
  let content = null;
  let image = null;

  // authored cells are kept as-is so their editor instrumentation survives
  [...row.querySelectorAll(':scope > div')].forEach((column) => {
    const isImageOnly = column.querySelector('picture') && !column.textContent.trim();
    if (isImageOnly && !image) {
      image = column;
      image.className = 'carousel-highlight-slide-image';
    } else if (!content) {
      content = column;
      content.className = 'carousel-highlight-slide-content';
    } else {
      content.append(...column.childNodes);
    }
  });

  if (!content) {
    content = document.createElement('div');
    content.className = 'carousel-highlight-slide-content';
  }
  slide.append(content);
  if (image) {
    slide.append(image);
    slide.classList.add('carousel-highlight-slide-has-image');
  }

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy && labeledBy.id) {
    slide.setAttribute('aria-labelledby', labeledBy.id);
  }

  return slide;
}

let carouselId = 0;
export default function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-highlight-${carouselId}`);
  const rows = [...block.querySelectorAll(':scope > div')]
    .filter((row) => row.textContent.trim() || row.querySelector('picture'));
  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', LABELS.roleDescription);

  const container = document.createElement('div');
  container.classList.add('carousel-highlight-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-highlight-slides');

  rows.forEach((row, idx) => {
    slidesWrapper.append(createSlide(row, idx, carouselId));
  });
  block.replaceChildren(container);
  container.append(slidesWrapper);

  if (!isSingleSlide) {
    const controls = document.createElement('nav');
    controls.className = 'carousel-highlight-controls';
    controls.setAttribute('aria-label', LABELS.controls);
    controls.innerHTML = `
      <p class="carousel-highlight-counter" aria-live="polite">
        <span class="carousel-highlight-counter-current">1</span>
        ${LABELS.of}
        <span class="carousel-highlight-counter-total">${rows.length}</span>
      </p>
      <div class="carousel-highlight-navigation-buttons">
        <button type="button" class="slide-prev" aria-label="${LABELS.previous}"></button>
        <button type="button" class="slide-next" aria-label="${LABELS.next}"></button>
      </div>
    `;
    container.append(controls);
    updateActiveSlide(block, 0);
    bindEvents(block);
  }

  slidesWrapper.querySelectorAll('picture > img').forEach((img) => {
    optimizePicture(img, false, [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }]);
  });

  if (!isSingleSlide) {
    const realSlides = slidesWrapper.querySelectorAll('.carousel-highlight-slide');
    const leading = createEdgeClone(realSlides[realSlides.length - 1]);
    const trailing = createEdgeClone(realSlides[0]);
    if (leading) slidesWrapper.prepend(leading);
    if (trailing) slidesWrapper.append(trailing);

    // keep the active slide centered once laid out and whenever the track resizes
    new ResizeObserver(() => {
      const index = parseInt(block.dataset.activeSlide, 10) || 0;
      centerSlide(slidesWrapper, realSlides[index], 'instant');
    }).observe(slidesWrapper);
  }
}
