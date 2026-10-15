/*
 * Customer account (Adobe Commerce account drop-in): orders list, customer details and
 * sign out. Not signed in: goes to the login page and back. No authoring fields.
 */
import {
  IS_UE, getLoginLink, getOrderLink, getProductLink, initializeAccount, isAuthenticated, signOut,
} from '../../scripts/commerce.js';

const div = (name) => {
  const d = document.createElement('div');
  d.className = `commerce-account-${name}`;
  return d;
};

const message = (wrapper, text) => {
  const p = document.createElement('p');
  p.className = 'commerce-account-message';
  p.textContent = text;
  wrapper.replaceChildren(p);
};

export default async function decorate(block) {
  // authored content (if any) stays in the DOM (hidden) for Universal Editor instrumentation
  const source = div('source');
  source.append(...block.children);
  source.hidden = true;

  const orders = div('orders');
  const details = div('details');
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'button secondary commerce-account-logout';
  logout.textContent = 'Sair da conta';
  const aside = div('aside');
  aside.append(details, logout);
  const wrapper = div('wrapper');
  wrapper.append(orders, aside);
  block.replaceChildren(wrapper, source);

  if (IS_UE) {
    message(wrapper, 'Minha conta: pedidos e dados exibidos para o cliente conectado.');
    return;
  }
  if (!isAuthenticated()) {
    window.location.replace(getLoginLink());
    return;
  }

  logout.addEventListener('click', () => {
    logout.disabled = true;
    signOut('/');
  });

  try {
    await initializeAccount();
    const [{ render }, OrdersList, CustomerInformation] = await Promise.all([
      import('@dropins/storefront-account/render.js'),
      ...['OrdersList', 'CustomerInformation']
        .map((name) => import(`@dropins/storefront-account/containers/${name}.js`).then((m) => m.default)),
    ]);
    await Promise.all([
      render.render(OrdersList, {
        withSearch: false,
        routeOrderDetails: (orderNumber) => getOrderLink(orderNumber),
        routeOrderProduct: (item) => (item?.product ? getProductLink(item.topLevelSku || item.product.sku) : '#'),
        routeTracking: () => '',
      })(orders),
      render.render(CustomerInformation, {})(details),
    ]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('commerce-account:', error);
    message(wrapper, 'Não foi possível carregar a sua conta no momento.');
  }
}
