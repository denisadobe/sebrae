/*
 * Minimal Adobe Commerce wiring for drop-ins (PDP + cart).
 * Reads the storefront config (/config.json), sets up the Core and Catalog Service
 * GraphQL clients and initializes the drop-ins on demand.
 */
import { getHeaders, getConfigValue, initializeConfig } from '@dropins/tools/lib/aem/configs.js';
import { FetchGraphQL } from '@dropins/tools/fetch-graphql.js';
import { initializers } from '@dropins/tools/initializer.js';
import { getMetadata } from './aem.js';

// Core (cart, checkout) and Catalog Service (product data) GraphQL clients
export const CORE_FETCH_GRAPHQL = new FetchGraphQL();
export const CS_FETCH_GRAPHQL = new FetchGraphQL();

export const IS_UE = /\.(stage-ue|ue)\.da\.live$/.test(window.location.hostname);

// pt-BR labels for the drop-ins (defaults are en_US)
export const LABELS = {
  PDP: {
    Product: {
      Incrementer: { label: 'Quantidade' },
      OutOfStock: { label: 'Esgotado' },
      AddToCart: { label: 'Adicionar ao carrinho' },
      Details: { label: 'Detalhes' },
      RegularPrice: { label: 'Preço normal' },
      SpecialPrice: { label: 'Preço promocional' },
      Image: { label: '{product} imagem {key} de {total}' },
    },
    Swatches: {
      Required: { label: 'Obrigatório' },
      ChooseOption: { label: 'Escolha uma opção' },
    },
    Carousel: {
      label: 'Galeria',
      Next: { label: 'Próxima' },
      Previous: { label: 'Anterior' },
      Slide: { label: 'Imagem' },
      Controls: { label: 'Controles da galeria', Button: { label: 'Mostrar imagem {key} de {total}' } },
    },
    Overlay: { Close: { label: 'Fechar' } },
    Zoom: { Close: { label: 'Fechar' } },
  },
};

const CONFIG_KEY = 'commerce-config';

async function getConfig() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CONFIG_KEY));
    if (cached && cached[':expiry'] > Date.now() / 1000) return cached;
  } catch (e) {
    // ignore malformed cache
  }
  const resp = await fetch(`${window.location.origin}/config.json`);
  if (!resp.ok) throw new Error(`Commerce config not found (${resp.status})`);
  const config = await resp.json();
  config[':expiry'] = Math.round(Date.now() / 1000) + 7200;
  sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}

let ready;

/** Initializes config + GraphQL clients once per page. */
export function initializeCommerce() {
  if (!ready) {
    ready = (async () => {
      initializeConfig(await getConfig());
      CORE_FETCH_GRAPHQL.setEndpoint(getConfigValue('commerce-core-endpoint') || getConfigValue('commerce-endpoint'));
      CORE_FETCH_GRAPHQL.setFetchGraphQlHeaders((prev) => ({ ...prev, ...getHeaders('all') }));
      CS_FETCH_GRAPHQL.setEndpoint(getConfigValue('commerce-endpoint'));
      CS_FETCH_GRAPHQL.setFetchGraphQlHeaders((prev) => ({ ...prev, ...getHeaders('cs') }));
    })();
  }
  return ready;
}

/** Cart drop-in (guest cart on the Core endpoint), initialized once. */
let cartReady;
export function initializeCart() {
  if (!cartReady) {
    cartReady = (async () => {
      await initializeCommerce();
      const { initialize, setEndpoint } = await import('@dropins/storefront-cart/api.js');
      setEndpoint(CORE_FETCH_GRAPHQL);
      await initializers.mountImmediately(initialize, {});
    })();
  }
  return cartReady;
}

/**
 * Product SKU: authored on the block (defaultSku), page metadata (sku)
 * or the URL (/products/{url-key}/{sku}).
 */
export function getProductSku(configuredSku) {
  return configuredSku
    || getMetadata('sku')
    || window.location.pathname.match(/\/products\/[\w-]+\/([\w-]+)$/)?.[1];
}
