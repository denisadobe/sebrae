/*
 * Cart: Adobe Commerce cart drop-in — items (quantity update, remove), order summary with
 * coupon, empty state. Checkout is out of scope for the demo.
 * Authoring (key-value table, optional):
 *   startShoppingUrl | link of the empty-cart button (default /cursos)
 */
import { readBlockConfig } from '../../scripts/aem.js';
import { CATALOG_PAGE, getProductLink, initializeCart } from '../../scripts/commerce.js';

const div = (name) => {
  const d = document.createElement('div');
  d.className = `commerce-cart-${name}`;
  return d;
};

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const startShopping = config.startshoppingurl || CATALOG_PAGE;

  // authored rows stay in the DOM (hidden) so the block keeps its Universal Editor instrumentation
  const source = div('source');
  source.append(...block.children);
  source.hidden = true;

  const list = div('list');
  const summary = div('summary');
  const wrapper = div('wrapper');
  wrapper.append(list, summary);
  block.replaceChildren(wrapper, source);

  try {
    await initializeCart();
    const [{ render }, { events }, CartSummaryList, OrderSummary, Coupons] = await Promise.all([
      import('@dropins/storefront-cart/render.js'),
      import('@dropins/tools/event-bus.js'),
      ...['CartSummaryList', 'OrderSummary', 'Coupons']
        .map((name) => import(`@dropins/storefront-cart/containers/${name}.js`).then((m) => m.default)),
    ]);

    await Promise.all([
      render.render(CartSummaryList, {
        routeProduct: (item) => getProductLink(item.topLevelSku || item.sku),
        routeEmptyCartCTA: () => startShopping,
        enableUpdateItemQuantity: true,
        enableRemoveItem: true,
      })(list),
      render.render(OrderSummary, {
        slots: {
          Coupons: (ctx) => {
            const coupons = document.createElement('div');
            render.render(Coupons)(coupons);
            ctx.appendChild(coupons);
          },
        },
      })(summary),
    ]);

    events.on('cart/data', (cart) => {
      const empty = !cart || cart.totalQuantity < 1;
      block.classList.toggle('is-empty', empty);
      summary.hidden = empty;
    }, { eager: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('commerce-cart:', error);
    const p = document.createElement('p');
    p.className = 'commerce-cart-message';
    p.textContent = 'Não foi possível carregar o carrinho no momento.';
    wrapper.replaceChildren(p);
  }
}
