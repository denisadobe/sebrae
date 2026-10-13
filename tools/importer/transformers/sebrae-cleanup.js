/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: sebrae.com.br site-wide cleanup.
 *
 * All selectors verified in migration-work/cleaned.html. styled-components
 * hashed classes (sc-xxxx + 6-char hash) change between page loads, so they
 * are NEVER used here - only stable ids, semantic classes (ps-*, cmp-*,
 * aem-*), tag names, and original asset hosts from metadata.json.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Hosts of tracking pixels found in metadata.json .images.mapping
// (c.clarity.ms/c.gif, google.com/pagead/1p-user-list, googleadservices.com/ccm/conversion).
const TRACKING_PIXEL_SELECTORS = [
  'img[src*="clarity.ms"]',
  'img[src*="/pagead/"]',
  'img[src*="googleadservices.com"]',
  'img[src*="doubleclick.net"]',
];

// Elements whose presence makes a grid column "real" content.
const MEDIA_SELECTOR = 'img, picture, video, iframe, table, hr, form, input, button';

function removeEmptyGridColumns(element) {
  // Empty AEM spacer columns found in cleaned.html, e.g.
  // <div class="aem-GridColumn ..."><div class="container-style-class">...
  //   <div id="destaques" class="cmp-container"><div class="aem-container"></div>...
  // and an empty <div class="cmp-teaser"> column at the end of the main grid.
  // Process deepest-first so nested empty columns collapse cleanly.
  const cols = [...element.querySelectorAll('.aem-GridColumn')].reverse();
  cols.forEach((col) => {
    if (!col.isConnected) return;
    if (col.textContent.replace(/ /g, ' ').trim() !== '') return;
    if (col.querySelector(MEDIA_SELECTOR)) return;
    col.remove();
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / widgets that sit outside the content and can interfere with parsing.
    WebImporter.DOMUtils.remove(element, [
      // OneTrust cookie consent: <div id="onetrust-consent-sdk"> (banner, preference
      // center, #ot-sdk-btn-floating, iframe.ot-text-resize all live inside it)
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '#ot-sdk-btn-floating',
      'iframe.ot-text-resize',
      // "Premio Reclame AQUI / Vote no Sebrae" popup:
      // <div class="sc-... modal-overlay"> > ... > <div class="ps-modal-pop-up">
      '.modal-overlay',
      '.ps-modal-pop-up',
      // Chat button: <div id="content-...-root-chatwidget"><div class="... ps-chat-widget">
      '[id$="-root-chatwidget"]',
      '.ps-chat-widget',
      // VLibras accessibility widget: <div class="enabled"><div class="active">
      // <div><div class="vw-plugin-top-wrapper"> and <div id="vlibras-access-wrapper">
      '#vlibras-access-wrapper',
      '.vw-plugin-top-wrapper',
      // Tracking pixels
      ...TRACKING_PIXEL_SELECTORS,
    ]);

    // VLibras root (<div class="enabled"> directly under <body>, wrapping
    // .vw-plugin-top-wrapper). Only remove when it is the VLibras container.
    element.querySelectorAll(':scope > div.enabled').forEach((el) => {
      if (el.textContent.trim() === '' && !el.querySelector('img, picture, iframe')) el.remove();
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Global chrome: <div id="ps-header"> (contains <header>, nav.ps-gn-nav,
    // #search-component, .ps-gn-flow-spacer, location bar button.location-button,
    // "Alto contraste" .ps-button-high-contrast) and <div id="ps-footer">
    // (contains <footer class="... ps-footer-organism ps-footer">).
    WebImporter.DOMUtils.remove(element, [
      '#ps-header',
      'header',
      '.ps-gn-flow-spacer',
      '#search-component',
      '.location-button',
      '.ps-button-high-contrast',
      '#ps-footer',
      'footer',
      // Leftovers that may survive the beforeTransform pass
      '#onetrust-consent-sdk',
      '.modal-overlay',
      '[id$="-root-chatwidget"]',
      '#vlibras-access-wrapper',
      ...TRACKING_PIXEL_SELECTORS,
      'link',
      'noscript',
    ]);

    // SEO-only heading injected by "Scripts added by user via page properties":
    // a bare <div> directly under <body> holding <h1>Sebrae | Abra, Formalize...</h1><p>...</p>.
    // It duplicates page title/description (captured as metadata), not authored content.
    element.querySelectorAll(':scope > div:not([id]):not([class])').forEach((el) => {
      const first = el.firstElementChild;
      if (first && first.tagName === 'H1' && !el.querySelector('#spa-root, table, img, picture')) {
        el.remove();
      }
    });

    // Section titles are h1 on the source ("Como podemos ajudar...", "Aprenda e evolua...",
    // "Como impulsionamos..."). Demote default-content h1s to h2 so the hero holds the
    // page's only h1. Block tables (already parsed) are left untouched.
    element.querySelectorAll('h1').forEach((h1) => {
      if (h1.closest('table')) return;
      const h2 = element.ownerDocument.createElement('h2');
      h2.append(...h1.childNodes);
      h1.replaceWith(h2);
    });

    // Empty spacer columns in the AEM grid.
    removeEmptyGridColumns(element);
  }
}
