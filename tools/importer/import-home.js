/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroBannerParser from './parsers/hero-banner.js';
import columnsQuicklinksParser from './parsers/columns-quicklinks.js';
import cardsIconParser from './parsers/cards-icon.js';
import cardsCompactParser from './parsers/cards-compact.js';
import carouselHighlightParser from './parsers/carousel-highlight.js';
import tabsArticlesParser from './parsers/tabs-articles.js';
import cardsTaggedParser from './parsers/cards-tagged.js';
import embedIframeParser from './parsers/embed-iframe.js';

// TRANSFORMER IMPORTS
import sebraeCleanupTransformer from './transformers/sebrae-cleanup.js';
import sebraeSectionsTransformer from './transformers/sebrae-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-banner': heroBannerParser,
  'columns-quicklinks': columnsQuicklinksParser,
  'cards-icon': cardsIconParser,
  'cards-compact': cardsCompactParser,
  'carousel-highlight': carouselHighlightParser,
  'tabs-articles': tabsArticlesParser,
  'cards-tagged': cardsTaggedParser,
  'embed-iframe': embedIframeParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE ={
  "name": "home",
  "description": "Sebrae homepage: hero banner with quick links, icon card grids, highlight carousel, articles tabs, audience cards and interest form embed",
  "urls": [
    "https://sebrae.com.br/"
  ],
  "blocks": [
    {
      "name": "hero-banner",
      "instances": [
        ".ps-hero-banner > div:nth-of-type(1)"
      ]
    },
    {
      "name": "columns-quicklinks",
      "instances": [
        ".ps-hero-banner .hero-banner-primary"
      ]
    },
    {
      "name": "cards-icon",
      "instances": [
        ".ps-info-cards > div:nth-of-type(2)",
        ".ps-highlight-carousel > div:nth-of-type(2)"
      ]
    },
    {
      "name": "cards-compact",
      "instances": [
        ".side-icons > div:nth-of-type(2)"
      ]
    },
    {
      "name": "carousel-highlight",
      "instances": [
        ".cmp-carousel"
      ]
    },
    {
      "name": "tabs-articles",
      "instances": [
        "[id^=\"panelcontainer\"]"
      ]
    },
    {
      "name": "cards-tagged",
      "instances": [
        ".ps-featured-card > div:nth-of-type(2)"
      ]
    },
    {
      "name": "embed-iframe",
      "instances": [
        ".embed__wrapper"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "hero",
      "selector": [
        ".ps-hero-banner",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(1)"
      ],
      "style": null,
      "blocks": [
        "hero-banner",
        "columns-quicklinks"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "como-podemos-ajudar",
      "selector": [
        ".ps-info-cards",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2)"
      ],
      "style": null,
      "blocks": [
        "cards-icon"
      ],
      "defaultContent": [
        ".ps-info-cards > div:nth-of-type(1)"
      ]
    },
    {
      "id": "section-3",
      "name": "black-friday",
      "selector": [
        ".side-icons",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(4)"
      ],
      "style": null,
      "blocks": [
        "cards-compact"
      ],
      "defaultContent": [
        ".side-icons > div:nth-of-type(1)"
      ]
    },
    {
      "id": "section-4",
      "name": "datasebrae-carousel",
      "selector": [
        ".cmp-carousel",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--tablet--12.aem-GridColumn--offset--tablet--0.aem-GridColumn--tablet--hide.aem-GridColumn--default--12:nth-of-type(6)"
      ],
      "style": null,
      "blocks": [
        "carousel-highlight"
      ],
      "defaultContent": []
    },
    {
      "id": "section-5",
      "name": "aprenda-e-evolua",
      "selector": [
        ".ps-highlight-carousel",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(7)"
      ],
      "style": "blue",
      "blocks": [
        "cards-icon"
      ],
      "defaultContent": [
        ".ps-highlight-carousel > div:nth-of-type(1)"
      ]
    },
    {
      "id": "section-6",
      "name": "artigos-ebooks",
      "selector": [
        "[id^=\"panelcontainer\"]",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(8)"
      ],
      "style": null,
      "blocks": [
        "tabs-articles"
      ],
      "defaultContent": []
    },
    {
      "id": "section-7",
      "name": "impulsionamos",
      "selector": [
        ".ps-featured-card",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(9)"
      ],
      "style": null,
      "blocks": [
        "cards-tagged"
      ],
      "defaultContent": [
        ".ps-featured-card > div:nth-of-type(1)"
      ]
    },
    {
      "id": "section-8",
      "name": "seu-interesse",
      "selector": [
        ".embed__wrapper",
        "#spa-root > div.sc-beySbL.cLUhAP.styled-page-template > div > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(2) > div.aem-container.aem-Grid.aem-Grid--12.aem-Grid--tablet--12.aem-Grid--default--12 > div.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(10)"
      ],
      "style": null,
      "blocks": [
        "embed-iframe"
      ],
      "defaultContent": []
    }
  ]
}
;

// TRANSFORMER REGISTRY
// Order matters: cleanup, then sections (breaks + Section Metadata).
// Scene7 images stay as real <img> (no DM carrier links) so Universal Editor
// image fields map to them; blocks render them via scripts/dm-images.js.
const transformers = [
  sebraeCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sebraeSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      let elements = [];
      try {
        elements = document.querySelectorAll(selector);
      } catch (e) {
        console.warn(`Invalid selector for block "${blockDef.name}": ${selector}`);
      }
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform (cleanup + section breaks)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse blocks (skip elements detached by an earlier parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup, Section Metadata, DM images)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path (root URL maps to the index page)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
