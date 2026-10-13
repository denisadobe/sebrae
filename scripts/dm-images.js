import { createOptimizedPicture as createAemOptimizedPicture } from './aem.js';
import { moveInstrumentation } from './ue-utils.js';

// Lives in its own module instead of patching the vendored scripts/aem.js.
// Blocks import createOptimizedPicture from here so Scene7 / DM Open API
// URLs keep their query params; everything else falls through to aem.js.

const DM_BREAKPOINTS = [
  { media: '(min-width: 600px)', width: 2000 }, // desktop
  { width: 750 }, // mobile / fallback (no media)
];

export function detectDynamicMediaUrl(urlStr) {
  if (!/^(https?:\/\/|\/\/)/i.test(urlStr)) return false;
  let u;
  try { u = new URL(urlStr, 'https://x/'); } catch { return false; }
  if (u.pathname.startsWith('/is/image/')) {
    return 'scene7';
  }
  if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname)
      && u.pathname.startsWith('/adobe/assets/urn:')) {
    return 'dm-openapi';
  }
  return false;
}

function buildScene7Rendition(src, { width, format }) {
  // Manipulate the query string verbatim — URL.searchParams percent-encodes `$`,
  // which breaks Scene7 IS/Image template parameters.
  const normalized = src.startsWith('//') ? `https:${src}` : src;
  const qIdx = normalized.indexOf('?');
  const base = qIdx >= 0 ? normalized.slice(0, qIdx) : normalized;
  const query = qIdx >= 0 ? normalized.slice(qIdx + 1) : '';
  const pairs = query.split('&').filter((p) => p);
  const filtered = pairs.filter((p) => {
    const k = p.split('=')[0];
    // fixed height would letterbox the new width; keep the authored crop instead
    return k !== 'wid' && k !== 'hei' && k !== 'fmt';
  });
  filtered.push(`wid=${width}`);
  filtered.push(`fmt=${format}`);
  return `${base}?${filtered.join('&')}`;
}

function buildDmOpenApiRendition(src, { width }) {
  const url = new URL(src, 'https://x/');
  url.searchParams.set('width', String(width));
  return url.toString();
}

function appendSource(picture, { type, srcset, media }) {
  const source = document.createElement('source');
  if (type) source.type = type;
  source.srcset = srcset;
  if (media) source.setAttribute('media', media);
  picture.append(source);
}

function renderScene7Picture(src, alt) {
  // keep transparency when the authored rendition asks for it (e.g. fmt=png-alpha)
  const alpha = /[?&]fmt=[^&]*alpha/i.test(src);
  const webp = alpha ? 'webp-alpha' : 'webp';
  const fallback = alpha ? 'png-alpha' : 'jpg';
  const picture = document.createElement('picture');
  DM_BREAKPOINTS.forEach((bp) => appendSource(picture, {
    type: 'image/webp',
    srcset: buildScene7Rendition(src, { width: bp.width, format: webp }),
    media: bp.media,
  }));
  DM_BREAKPOINTS.forEach((bp) => appendSource(picture, {
    type: alpha ? 'image/png' : 'image/jpeg',
    srcset: buildScene7Rendition(src, { width: bp.width, format: fallback }),
    media: bp.media,
  }));
  const img = document.createElement('img');
  img.src = buildScene7Rendition(src, { width: 750, format: fallback });
  img.alt = alt;
  img.loading = 'lazy';
  picture.append(img);
  return picture;
}

function renderDmOpenApiPicture(src, alt) {
  const picture = document.createElement('picture');
  DM_BREAKPOINTS.forEach((bp) => appendSource(picture, {
    srcset: buildDmOpenApiRendition(src, { width: bp.width }),
    media: bp.media,
  }));
  const img = document.createElement('img');
  img.src = buildDmOpenApiRendition(src, { width: 750 });
  img.alt = alt;
  img.loading = 'lazy';
  picture.append(img);
  return picture;
}

/**
 * DM-aware drop-in for aem.js createOptimizedPicture.
 * @param {string} src Image URL
 * @param {string} alt Alt text
 * @param {boolean} eager Load eagerly
 * @param {Array} breakpoints Breakpoints (non-DM images only)
 * @returns {Element} picture element
 */
export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = undefined) {
  const family = detectDynamicMediaUrl(src);
  if (family) {
    const picture = family === 'scene7'
      ? renderScene7Picture(src, alt)
      : renderDmOpenApiPicture(src, alt);
    if (eager) picture.querySelector('img').loading = 'eager';
    return picture;
  }
  return createAemOptimizedPicture(src, alt, eager, breakpoints);
}

/**
 * Replaces an authored <picture> with an optimized one, keeping the
 * Universal Editor instrumentation of the authored <img>.
 * @param {Element} img authored image inside a <picture>
 * @param {boolean} eager Load eagerly
 * @param {Array} breakpoints Breakpoints (non-DM images only)
 * @returns {Element} the new picture element
 */
export function optimizePicture(img, eager = false, breakpoints = undefined) {
  const picture = createOptimizedPicture(img.src, img.alt, eager, breakpoints);
  moveInstrumentation(img, picture.querySelector('img'));
  img.closest('picture').replaceWith(picture);
  return picture;
}
