/*
 * Order details of the signed-in customer (?orderRef={order number}), Adobe Commerce order
 * drop-in. Not signed in: goes to the login page and back. No order: goes to the account.
 * No authoring fields.
 */
import {
  ACCOUNT_PAGE, IS_UE, getLoginLink, isAuthenticated,
} from '../../scripts/commerce.js';
import renderOrder from '../../scripts/commerce-order.js';

const message = (view, text) => {
  const p = document.createElement('p');
  p.className = 'commerce-order-message';
  p.textContent = text;
  view.replaceChildren(p);
};

export default async function decorate(block) {
  // authored content (if any) stays in the DOM (hidden) for Universal Editor instrumentation
  const source = document.createElement('div');
  source.className = 'commerce-order-source';
  source.append(...block.children);
  source.hidden = true;
  const view = document.createElement('div');
  block.replaceChildren(view, source);

  const orderRef = new URLSearchParams(window.location.search).get('orderRef');
  if (IS_UE) {
    message(view, 'Detalhes do pedido: exibidos para o cliente conectado (?orderRef=número do pedido).');
    return;
  }
  if (!isAuthenticated()) {
    window.location.replace(getLoginLink());
    return;
  }
  if (!orderRef) {
    window.location.replace(ACCOUNT_PAGE);
    return;
  }

  try {
    const { events } = await import('@dropins/tools/event-bus.js');
    // unknown order or another customer's order
    events.on('order/error', () => window.location.replace(ACCOUNT_PAGE));
    await renderOrder(view, { orderRef });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('commerce-order:', error);
    message(view, 'Não foi possível carregar o pedido no momento.');
  }
}
