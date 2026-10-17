/*
 * Minimal Adobe Commerce wiring for drop-ins (PDP + cart).
 * Reads the storefront config (/config.json), sets up the Core and Catalog Service
 * GraphQL clients and initializes the drop-ins on demand.
 */
import { getHeaders, getConfigValue, initializeConfig } from '@dropins/tools/lib/aem/configs.js';
import { FetchGraphQL } from '@dropins/tools/fetch-graphql.js';
import { initializers } from '@dropins/tools/initializer.js';
import { getMetadata, loadCSS } from './aem.js';

// drop-in design tokens (Sebrae brand) — only pages that use commerce code load them
loadCSS(`${window.hlx.codeBasePath}/styles/commerce.css`);

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
export const CHECKOUT_PAGE = '/loja/checkout';
// logged-in area
export const LOGIN_PAGE = '/loja/entrar';
export const SIGNUP_PAGE = '/loja/cadastro';
export const FORGOT_PASSWORD_PAGE = '/loja/esqueci-senha';
export const ACCOUNT_PAGE = '/loja/conta';
export const ORDER_PAGE = '/loja/conta/pedido';

/** Link to the generic product page for a given SKU. */
export const getProductLink = (sku) => `${PRODUCT_PAGE}?sku=${encodeURIComponent(sku)}`;

/** Link to an order of the signed-in customer. */
export const getOrderLink = (orderNumber) => `${ORDER_PAGE}?orderRef=${encodeURIComponent(orderNumber)}`;

// customer token set by the auth drop-in on sign in (cookie, so the header can read it cheaply)
const AUTH_COOKIE = 'auth_dropin_user_token';
export const getUserToken = () => document.cookie.split('; ')
  .find((c) => c.startsWith(`${AUTH_COOKIE}=`))?.slice(AUTH_COOKIE.length + 1);
export const isAuthenticated = () => !!getUserToken();

/** Same-site path from ?redirect= (after sign in), or the fallback. */
export function getRedirect(fallback = ACCOUNT_PAGE) {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  return redirect && /^\/(?!\/)/.test(redirect) ? redirect : fallback;
}

/** Login page that comes back to the current page after sign in. */
export const getLoginLink = (back = window.location.pathname + window.location.search) => `${LOGIN_PAGE}?redirect=${encodeURIComponent(back)}`;

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

      // signed-in customer: Core requests carry the customer token (cart, orders, account)
      const setAuthHeader = (authenticated) => {
        if (authenticated && getUserToken()) CORE_FETCH_GRAPHQL.setFetchGraphQlHeader('Authorization', `Bearer ${getUserToken()}`);
        else CORE_FETCH_GRAPHQL.removeFetchGraphQlHeader('Authorization');
      };
      setAuthHeader(isAuthenticated());
      const { events } = await import('@dropins/tools/event-bus.js');
      events.on('authenticated', setAuthHeader);
    })();
  }
  return ready;
}

/** Initializes a drop-in once: Core endpoint + pt-BR labels. */
const dropins = {};
function initializeDropin(name, loadApi, labels) {
  if (!dropins[name]) {
    dropins[name] = (async () => {
      await initializeCommerce();
      const [{ initialize, setEndpoint }, dictionary] = await Promise.all([loadApi(), labels?.()]);
      setEndpoint(CORE_FETCH_GRAPHQL);
      await initializers.mountImmediately(initialize, { langDefinitions: { default: dictionary } });
    })();
  }
  return dropins[name];
}

const accountLabels = (key) => () => import('./commerce-account-labels.js').then((m) => m[key]);

/** Auth drop-in (sign in, sign up, password) — needed before the cart for signed-in customers. */
export const initializeAuth = () => initializeDropin('auth', () => import('@dropins/storefront-auth/api.js'), accountLabels('AUTH_LABELS'));
/** Account drop-in (customer details, orders list, addresses). */
export const initializeAccount = () => initializeDropin('account', () => import('@dropins/storefront-account/api.js'), accountLabels('ACCOUNT_LABELS'));
/** Checkout drop-in (address, delivery, payment, place order). */
export const initializeCheckout = () => initializeDropin('checkout', () => import('@dropins/storefront-checkout/api.js'), accountLabels('CHECKOUT_LABELS'));

/**
 * Order drop-in for one order: a signed-in customer's order number (orderRef) or the data of
 * an order just placed (orderData).
 */
export async function initializeOrder({ orderRef, orderData } = {}) {
  await initializeCommerce();
  const [{ initialize, setEndpoint }, { ORDER_LABELS }] = await Promise.all([
    import('@dropins/storefront-order/api.js'),
    import('./commerce-account-labels.js'),
  ]);
  setEndpoint(CORE_FETCH_GRAPHQL);
  await initializers.mountImmediately(initialize, {
    langDefinitions: { default: ORDER_LABELS },
    ...(orderData ? { orderData } : { orderRef }),
  });
}

/** Signs the customer out (revokes the token) and goes to the given page. */
export async function signOut(destination = '/') {
  await initializeAuth();
  const { revokeCustomerToken } = await import('@dropins/storefront-auth/api.js');
  await revokeCustomerToken();
  // signed in with the identity provider (single sign-on, scripts/sso.js): end that session too
  const ssoDomain = localStorage.getItem('sso-session');
  localStorage.removeItem('sso-session');
  localStorage.removeItem('alm-session');
  const clientId = getConfigValue('sso-client-id');
  if (ssoDomain && clientId) {
    const logout = new URL(`https://${ssoDomain}/v2/logout`);
    logout.search = new URLSearchParams({
      client_id: clientId,
      returnTo: new URL(destination, window.location.origin).href,
    });
    window.location.href = logout.href;
    return;
  }
  window.location.href = destination;
}

/** Cart drop-in (guest or customer cart on the Core endpoint), initialized once. */
let cartReady;
export function initializeCart() {
  if (!cartReady) {
    cartReady = (async () => {
      await initializeCommerce();
      // a signed-in customer gets their own cart (the guest cart is merged by the drop-in)
      if (isAuthenticated()) await initializeAuth();
      const { initialize, setEndpoint } = await import('@dropins/storefront-cart/api.js');
      setEndpoint(CORE_FETCH_GRAPHQL);
      await initializers.mountImmediately(initialize, { langDefinitions: { default: LABELS } });
      window.dispatchEvent(new Event('commerce:cart-ready'));
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
