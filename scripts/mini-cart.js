/*
 * Header mini-cart (commerce branch): cart button with item count + dropdown panel with the
 * cart drop-in MiniCart container. The button sits with the tools on desktop and with the
 * mobile actions on small screens.
 */
import {
  CART_PAGE, CATALOG_PAGE, getProductLink, initializeCart,
} from './commerce.js';

const isDesktop = window.matchMedia('(width >= 900px)');

export default async function addMiniCart(navMain) {
  const tools = navMain.querySelector('.nav-tools');
  const mobileActions = navMain.querySelector('.nav-mobile-actions');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-cart-button';
  button.setAttribute('aria-label', 'Carrinho');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'nav-cart-panel');
  const cartIcon = document.createElement('span');
  cartIcon.className = 'nav-icon nav-icon-cart';
  cartIcon.setAttribute('aria-hidden', 'true');
  button.append(cartIcon);

  const panel = document.createElement('div');
  panel.className = 'nav-cart-panel';
  panel.id = 'nav-cart-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Carrinho');
  panel.hidden = true;
  navMain.append(panel);

  const place = () => {
    if (isDesktop.matches && tools) {
      const li = document.createElement('li');
      li.className = 'nav-cart';
      li.append(button);
      tools.append(li);
    } else if (mobileActions) {
      mobileActions.prepend(button);
    }
    navMain.querySelectorAll('li.nav-cart:empty').forEach((li) => li.remove());
  };
  place();
  isDesktop.addEventListener('change', place);

  let rendered = false;
  const toggle = async (open = panel.hidden) => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', open);
    if (open && !rendered) {
      rendered = true;
      const [{ render }, MiniCart] = await Promise.all([
        import('@dropins/storefront-cart/render.js'),
        import('@dropins/storefront-cart/containers/MiniCart.js').then((m) => m.default),
      ]);
      await render.render(MiniCart, {
        routeEmptyCartCTA: () => CATALOG_PAGE,
        routeCart: () => CART_PAGE,
        routeProduct: (item) => getProductLink(item.topLevelSku || item.sku),
        enableUpdateItemQuantity: true,
        enableRemoveItem: true,
      })(panel);
    }
  };
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target)) toggle(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !panel.hidden) {
      toggle(false);
      button.focus();
    }
  });

  await initializeCart();
  const { events } = await import('@dropins/tools/event-bus.js');
  events.on('cart/data', (cart) => {
    const count = cart?.totalQuantity || 0;
    if (count) button.dataset.count = count;
    else delete button.dataset.count;
    button.setAttribute('aria-label', count ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho');
  }, { eager: true });
}
