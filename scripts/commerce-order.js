/*
 * Order view (Adobe Commerce order drop-in): status, items, customer details and totals.
 * Shared by the order details page (commerce-order block) and the checkout confirmation.
 * Courses are virtual products, so there is no shipping status card. Free virtual orders (free
 * courses, express checkout) also hide the customer details: their billing address is the
 * automatic one and there is no payment.
 */
import {
  ACCOUNT_PAGE, CATALOG_PAGE, getProductLink, initializeOrder,
} from './commerce.js';

const el = (className, tag = 'div') => {
  const e = document.createElement(tag);
  e.className = className;
  return e;
};

const link = (className, href, text) => {
  const a = el(className, 'a');
  a.href = href;
  a.textContent = text;
  return a;
};

/**
 * Renders an order into the container.
 * @param {HTMLElement} container
 * @param {Object} options
 * @param {string} [options.orderRef] order number of the signed-in customer
 * @param {Object} [options.orderData] data of an order just placed (order/placed event)
 * @param {boolean} [options.confirmation] adds the "thank you" header and next steps
 */
export default async function renderOrder(container, { orderRef, orderData, confirmation } = {}) {
  const header = el('commerce-order-header');
  const status = el('commerce-order-status');
  const products = el('commerce-order-products');
  const customer = el('commerce-order-customer');
  const summary = el('commerce-order-summary');
  const actions = el('commerce-order-actions');
  const main = el('commerce-order-main');
  const aside = el('commerce-order-aside');
  main.append(...(confirmation ? [header] : []), status, products, customer);
  aside.append(summary, actions);
  const layout = el('commerce-order-layout');
  layout.append(main, aside);
  container.replaceChildren(layout);

  // free + virtual order: no address / payment details to show
  const { events } = await import('@dropins/tools/event-bus.js');
  const hideDetails = (order) => {
    customer.hidden = !!order && order.isVirtual && Number(order.grandTotal?.value) === 0;
  };
  events.on('order/data', hideDetails, { eager: true });
  if (orderData) hideDetails(orderData);

  await initializeOrder({ orderRef, orderData });
  const [{ render }, ...containers] = await Promise.all([
    import('@dropins/storefront-order/render.js'),
    ...['OrderHeader', 'OrderStatus', 'OrderProductList', 'CustomerDetails', 'OrderCostSummary']
      .map((name) => import(`@dropins/storefront-order/containers/${name}.js`).then((m) => m.default)),
  ]);
  const [
    OrderHeader, OrderStatus, OrderProductList, CustomerDetails, OrderCostSummary,
  ] = containers;

  await Promise.all([
    confirmation && render.render(OrderHeader, { orderData })(header),
    // no cancel / reorder / return actions for courses
    render.render(OrderStatus, { slots: { OrderActions: () => null } })(status),
    render.render(OrderProductList, {
      routeProductDetails: (product) => getProductLink(product?.product?.sku || product?.sku),
    })(products),
    render.render(CustomerDetails)(customer),
    render.render(OrderCostSummary)(summary),
  ]);

  actions.append(
    link('button primary', ACCOUNT_PAGE, 'Ir para minha conta'),
    link('button secondary', CATALOG_PAGE, 'Ver mais cursos'),
  );
}
