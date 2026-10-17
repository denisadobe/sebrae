/*
 * Checkout for signed-in customers (Adobe Commerce checkout drop-in), no online payment:
 * courses are free virtual products, so the store's "no payment information required"
 * method (or another offline method) is used and there is no shipping step.
 * Physical products (demo store) still get shipping address + delivery.
 * Express checkout (free + virtual cart, e.g. free courses): only the contact, the summary and
 * "Confirmar inscrição" — the billing address Commerce requires is filled in automatically
 * (customer's default billing address, or a neutral address) and the "free" method is set.
 * After the order: confirmation in place, URL moves to the order details page.
 * Not signed in: login page and back. Empty cart: cart page. No authoring fields.
 */
import {
  CART_PAGE, CORE_FETCH_GRAPHQL, IS_UE, getLoginLink, getOrderLink, getProductLink,
  initializeAccount, initializeCart, initializeCheckout, initializeOrder, isAuthenticated,
} from '../../scripts/commerce.js';
import renderOrder from '../../scripts/commerce-order.js';

const SHIPPING_FORM = 'selectedShippingAddress';
const BILLING_FORM = 'selectedBillingAddress';
const LOGIN_FORM = 'login-form';

// Commerce always requires a billing address; free virtual orders get this one when the
// customer has no saved billing address (no shipping, nothing to charge)
const EXPRESS_BILLING_ADDRESS = {
  street: ['Inscrição online'],
  city: 'Brasília',
  region: 'DF',
  postcode: '70000-000',
  countryCode: 'BR',
  telephone: '0000000000',
};

// no online payment: Adobe Payment Services methods (card, wallets) are hidden even when
// enabled on the store; offline methods (free, check, bank transfer...) are listed
const NO_ONLINE_PAYMENT = Object.fromEntries([
  'hosted_fields', 'smart_buttons', 'apple_pay', 'google_pay', 'vault', 'fastlane', 'apm',
].map((method) => [`payment_services_paypal_${method}`, { enabled: false }]));

const div = (name) => {
  const d = document.createElement('div');
  d.className = `commerce-checkout-${name}`;
  return d;
};

const message = (wrapper, text) => {
  const p = document.createElement('p');
  p.className = 'commerce-checkout-message';
  p.textContent = text;
  wrapper.replaceChildren(p);
};

export default async function decorate(block) {
  // authored content (if any) stays in the DOM (hidden) for Universal Editor instrumentation
  const source = div('source');
  source.append(...block.children);
  source.hidden = true;

  const $ = Object.fromEntries([
    'error', 'stock', 'login', 'shipping', 'bill-to-shipping', 'delivery', 'payment', 'billing',
    'express', 'place-order', 'summary', 'items',
  ].map((name) => [name, div(name)]));
  $.express.textContent = 'Inscrição gratuita: não é preciso informar endereço nem dados de pagamento.';
  $.express.hidden = true;
  const main = div('main');
  main.append(...['error', 'stock', 'login', 'shipping', 'bill-to-shipping', 'delivery', 'payment', 'billing', 'express',
    'place-order']
    .map((name) => $[name]));
  const aside = div('aside');
  aside.append($.summary, $.items);
  const wrapper = div('wrapper');
  wrapper.append(main, aside);
  block.replaceChildren(wrapper, source);

  if (IS_UE) {
    message(wrapper, 'Checkout: exibido para o cliente conectado com itens no carrinho.');
    return;
  }
  if (!isAuthenticated()) {
    window.location.replace(getLoginLink());
    return;
  }

  try {
    await Promise.all([
      initializeCart(), initializeAccount(), initializeCheckout(), initializeOrder(),
    ]);
    const [
      { events },
      checkoutUtils,
      { placeOrder },
      { getStoreConfigCache, setBillingAddress, setPaymentMethod },
      { render: checkout },
      { render: account },
      { render: cart },
      [ServerError, OutOfStock, LoginForm, BillToShippingAddress, ShippingMethods,
        PaymentMethods, PlaceOrder],
      Addresses,
      [OrderSummary, CartSummaryList],
    ] = await Promise.all([
      import('@dropins/tools/event-bus.js'),
      import('@dropins/storefront-checkout/lib/utils.js'),
      import('@dropins/storefront-order/api.js'),
      import('@dropins/storefront-checkout/api.js'),
      import('@dropins/storefront-checkout/render.js'),
      import('@dropins/storefront-account/render.js'),
      import('@dropins/storefront-cart/render.js'),
      Promise.all(['ServerError', 'OutOfStock', 'LoginForm', 'BillToShippingAddress', 'ShippingMethods',
        'PaymentMethods', 'PlaceOrder']
        .map((name) => import(`@dropins/storefront-checkout/containers/${name}.js`).then((m) => m.default))),
      import('@dropins/storefront-account/containers/Addresses.js').then((m) => m.default),
      Promise.all(['OrderSummary', 'CartSummaryList']
        .map((name) => import(`@dropins/storefront-cart/containers/${name}.js`).then((m) => m.default))),
    ]);
    const {
      getCartAddress, isVirtualCart, setAddressOnCart, validateForms,
    } = checkoutUtils;

    // empty cart (and no order just placed): back to the cart page
    const checkCart = (data) => {
      if (!events.lastPayload('order/placed') && (!data || !data.items?.length)) {
        window.location.replace(CART_PAGE);
      }
    };
    events.on('cart/initialized', checkCart, { eager: true });
    events.on('cart/data', checkCart);
    // signed out from the contact details: back to the login page
    events.on('authenticated', (authenticated) => {
      if (!authenticated) window.location.replace(getLoginLink());
    });

    // free + virtual cart (courses): express checkout, no address or payment step
    const isExpress = (data) => !!data && isVirtualCart(data)
      && (data.availablePaymentMethods || []).some((method) => method.code === 'free');
    let express = false;

    // billing address + "free" method set automatically before placing an express order
    const prepareExpressOrder = async () => {
      const { data } = await CORE_FETCH_GRAPHQL.fetchGraphQl(`{
        customer { firstname lastname default_billing addresses { id } }
      }`);
      const customer = data?.customer || {};
      const savedId = Number(customer.default_billing) || customer.addresses?.[0]?.id;
      await setBillingAddress(savedId ? { customerAddressId: Number(savedId) } : {
        address: {
          ...EXPRESS_BILLING_ADDRESS,
          firstName: customer.firstname || 'Cliente',
          lastName: customer.lastname || 'Sebrae',
        },
      });
      await setPaymentMethod({ code: 'free' });
    };

    const shippingRef = { current: null };
    const billingRef = { current: null };

    // saved addresses of the customer (or a new address form), kept in sync with the cart
    const renderAddresses = (container, type, data, formRef) => {
      const isShipping = type === 'shipping';
      const cartAddress = getCartAddress(data, type);
      const setOnCart = setAddressOnCart({ type, debounceMs: 1000 });
      let first = true;
      return account.render(Addresses, {
        title: isShipping ? 'Endereço de entrega' : 'Endereço de cobrança',
        addressFormTitle: isShipping ? 'Endereço de entrega' : 'Endereço de cobrança',
        defaultSelectAddressId: cartAddress ? cartAddress.id ?? 0 : undefined,
        fieldIdPrefix: type,
        formName: isShipping ? SHIPPING_FORM : BILLING_FORM,
        forwardFormRef: formRef,
        inputsDefaultValueSet: { countryCode: getStoreConfigCache()?.defaultCountry || 'BR' },
        minifiedView: false,
        selectable: true,
        selectShipping: isShipping,
        selectBilling: !isShipping,
        showBillingCheckBox: false,
        showShippingCheckBox: false,
        showSaveCheckBox: true,
        onAddressData: (values) => {
          // keep the address already on the cart on the first render
          if (!first || !cartAddress) setOnCart(values);
          first = false;
        },
      })(container);
    };

    let shipping;
    let billing;
    const showAddresses = async (data) => {
      if (!data) return;
      const virtual = isVirtualCart(data);
      express = isExpress(data);
      main.classList.toggle('is-virtual', virtual);
      main.classList.toggle('is-express', express);
      $.express.hidden = !express;
      if (express) {
        // nothing to fill in: no shipping, billing set automatically on "Confirmar inscrição"
        shipping?.remove();
        billing?.remove();
        shipping = null;
        billing = null;
        shippingRef.current = null;
        billingRef.current = null;
        return;
      }
      if (virtual) {
        shipping?.remove();
        shipping = null;
        shippingRef.current = null;
      } else if (!shipping) {
        shipping = await renderAddresses($.shipping, 'shipping', data, shippingRef);
      }
      if (!billing) billing = await renderAddresses($.billing, 'billing', data, billingRef);
    };

    await Promise.all([
      checkout.render(ServerError, {
        autoScroll: true,
        onRetry: () => wrapper.classList.remove('has-error'),
        onServerError: () => wrapper.classList.add('has-error'),
      })($.error),
      checkout.render(OutOfStock, { routeCart: () => CART_PAGE })($.stock),
      checkout.render(LoginForm, { name: LOGIN_FORM })($.login),
      checkout.render(BillToShippingAddress, {})($['bill-to-shipping']),
      checkout.render(ShippingMethods)($.delivery),
      checkout.render(PaymentMethods, { slots: { Methods: NO_ONLINE_PAYMENT } })($.payment),
      checkout.render(PlaceOrder, {
        handleValidation: () => validateForms(express ? [{ name: LOGIN_FORM }] : [
          { name: LOGIN_FORM },
          { name: SHIPPING_FORM, ref: shippingRef },
          { name: BILLING_FORM, ref: billingRef },
        ]),
        handlePlaceOrder: async ({ cartId }) => {
          wrapper.classList.add('is-placing');
          try {
            if (express) await prepareExpressOrder();
            await placeOrder(cartId);
          } finally {
            wrapper.classList.remove('is-placing');
          }
        },
      })($['place-order']),
      cart.render(OrderSummary, {})($.summary),
      cart.render(CartSummaryList, {
        variant: 'secondary',
        routeProduct: (item) => getProductLink(item.topLevelSku || item.sku),
      })($.items),
    ]);

    events.on('checkout/initialized', showAddresses, { eager: true });
    events.on('checkout/updated', showAddresses);
    events.on('checkout/values', ({ isBillToShipping }) => {
      $.billing.hidden = !!isBillToShipping && !main.classList.contains('is-virtual');
    });

    // order placed: confirmation in place, URL of the order details (reload-safe)
    events.on('order/placed', async (orderData) => {
      window.history.pushState({}, '', getOrderLink(orderData.number));
      window.scrollTo(0, 0);
      const confirmation = div('confirmation');
      block.replaceChildren(confirmation, source);
      await renderOrder(confirmation, { orderData, confirmation: true });
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('commerce-checkout:', error);
    message(wrapper, 'Não foi possível carregar o checkout no momento.');
  }
}
