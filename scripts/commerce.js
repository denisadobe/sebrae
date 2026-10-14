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
  // shared UI components (cart items, quantity, pagination)
  Dropin: {
    CartItem: {
      each: { label: 'cada' },
      pricePerItem: { label: 'preço por item' },
      quantity: { label: 'Quantidade' },
      remove: { label: 'Remover {product} do carrinho' },
      removeDefault: { label: 'Remover item do carrinho' },
      taxIncluded: { label: 'com impostos' },
      taxExcluded: { label: 'sem impostos' },
      updating: { label: 'Atualizando {product}' },
    },
    Incrementer: {
      decreaseLabel: 'Diminuir quantidade',
      increaseLabel: 'Aumentar quantidade',
      label: 'Quantidade',
      errorMessage: 'Informe uma quantidade válida',
    },
    Pagination: {
      backwardButton: { ariaLabel: 'Página anterior' },
      forwardButton: { ariaLabel: 'Próxima página' },
    },
  },
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
  Search: {
    PLP: {
      noResults: 'Nenhum resultado encontrado.',
      searchError: 'Ocorreu um erro na busca.',
    },
    Facet: {
      showMore: 'Ver mais',
      showLess: 'Ver menos',
      clearAll: 'Limpar',
      clearAllFilters: 'Limpar filtros',
    },
    SortBy: {
      title: 'Ordenar por',
      lowToHigh: 'Menor preço',
      highToLow: 'Maior preço',
      relevance: 'Relevância',
      position: 'Destaques',
      name: 'Nome',
      price: 'Preço',
    },
  },
  Cart: {
    Cart: {
      heading: 'Carrinho ({count})',
      editCart: 'Editar',
      viewAll: 'Ver tudo no carrinho',
      viewMore: 'Ver mais',
      loadingLabel: 'Carregando carrinho',
    },
    CartSummaryTable: {
      item: 'Item', price: 'Preço', qty: 'Qtd.', subtotal: 'Subtotal', mobilePrice: 'Preço', mobileQty: 'Qtd.', mobileSubtotal: 'Subtotal',
    },
    MiniCart: {
      heading: 'Carrinho ({count})',
      subtotal: 'Subtotal',
      subtotalExcludingTaxes: 'Subtotal sem impostos',
      cartLink: 'Ver carrinho',
      checkoutLink: 'Finalizar inscrição',
      loadingLabel: 'Carregando carrinho',
      cartUpdated: 'Carrinho atualizado, {count} itens',
    },
    EmptyCart: { heading: 'Seu carrinho está vazio', cta: 'Ver cursos' },
    PriceSummary: {
      checkout: 'Finalizar inscrição',
      orderSummary: 'Resumo do pedido',
      loadingLabel: 'Carregando resumo',
      subTotal: { label: 'Subtotal', withTaxes: 'com impostos', withoutTaxes: 'sem impostos' },
      total: {
        estimated: 'Total estimado', free: 'Grátis', label: 'Total', withoutTax: 'Total sem impostos', saved: 'Economia',
      },
      taxes: { total: 'Impostos', totalOnly: 'Impostos', estimated: 'Impostos estimados' },
      coupon: {
        applyAction: 'Aplicar', placeholder: 'Código de desconto', title: 'Cupom de desconto', ariaLabelRemove: 'Remover cupom',
      },
    },
    CartItem: {
      includingTax: 'com impostos',
      excludingTax: 'sem impostos',
      regularPrice: 'Preço normal',
      discountedPrice: 'Preço com desconto',
      itemBeingRemoved: 'Removendo "{product}"',
      itemRemoved: '"{product}" foi removido',
      itemRemovedDescription: 'Mudou de ideia? Você pode desfazer.',
      undoAction: 'Desfazer',
      dismissAction: 'Fechar',
      confirmDeleteHeading: 'Remover "{product}" do carrinho?',
      confirmAction: 'Remover',
      cancelAction: 'Cancelar',
    },
  },
};

// Demo pages (commerce branch) — all under /loja so the DA folder opens in the branch's editor
export const PRODUCT_PAGE = '/loja/produto';
export const CART_PAGE = '/loja/carrinho';
export const CATALOG_PAGE = '/loja/cursos';

/** Link to the generic product page for a given SKU. */
export const getProductLink = (sku) => `${PRODUCT_PAGE}?sku=${encodeURIComponent(sku)}`;

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
      await initializers.mountImmediately(initialize, { langDefinitions: { default: LABELS } });
    })();
  }
  return cartReady;
}

/**
 * Product SKU: ?sku= query parameter (generic /loja/produto page), authored on the block
 * (defaultSku), page metadata (sku) or the URL (/products/{url-key}/{sku}).
 */
export function getProductSku(configuredSku) {
  return new URLSearchParams(window.location.search).get('sku')
    || configuredSku
    || getMetadata('sku')
    || window.location.pathname.match(/\/products\/[\w-]+\/([\w-]+)$/)?.[1];
}

/** Product discovery drop-in (search / listing on the Catalog Service), initialized once. */
let searchReady;
export function initializeSearch() {
  if (!searchReady) {
    searchReady = (async () => {
      await initializeCommerce();
      const { initialize, setEndpoint } = await import('@dropins/storefront-product-discovery/api.js');
      setEndpoint(CS_FETCH_GRAPHQL);
      await initializers.mountImmediately(initialize, { langDefinitions: { default: LABELS } });
    })();
  }
  return searchReady;
}
