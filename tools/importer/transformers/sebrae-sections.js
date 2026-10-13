/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: sebrae.com.br section breaks + Section Metadata.
 *
 * Uses payload.template.sections from page-templates.json. Each section's
 * `selector` array is tried in order; the first entry is a stable semantic
 * selector (.ps-hero-banner, .ps-info-cards, .side-icons, .cmp-carousel,
 * .ps-highlight-carousel, [id^="panelcontainer"], .ps-featured-card,
 * .embed__wrapper - all verified in migration-work/cleaned.html). The
 * fallbacks contain styled-components hashes and may not match on a fresh
 * load; in that case the section is simply skipped (never guessed).
 *
 * Breaks are inserted in beforeTransform (before parsers replace section
 * elements); Section Metadata is inserted in afterTransform anchored to a
 * marker <hr>.
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';

function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    let el = null;
    try { el = root.querySelector(sel); } catch (e) { el = null; }
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length < 2) return;
  const doc = element.ownerDocument || document;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue;
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue;

      const hr = doc.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
