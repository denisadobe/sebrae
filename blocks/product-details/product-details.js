/*
 * Product details: Adobe Commerce PDP drop-in (gallery, title, price, options, quantity,
 * add to cart, description, attributes). Product data loads at runtime from the catalog.
 * Authoring: key-value table — defaultSku | <SKU>. Without it the SKU comes from page
 * metadata (sku) or the URL (/products/{url-key}/{sku}).
 */
import { readBlockConfig } from '../../scripts/aem.js';
import {
  CS_FETCH_GRAPHQL, LABELS, IS_UE, getProductSku, initializeCart, initializeCommerce,
} from '../../scripts/commerce.js';

const IMAGE_PARAMS = { width: 960, height: 1191 };

const PARTS = ['header', 'price', 'short-description', 'options', 'quantity', 'add-to-cart',
  'description', 'attributes'];

const div = (name, ...children) => {
  const d = document.createElement('div');
  d.className = `product-details-${name}`;
  d.append(...children);
  return d;
};

function message(content, text, type = 'info') {
  const p = document.createElement('p');
  p.className = `product-details-message product-details-message-${type}`;
  p.textContent = text;
  content.replaceChildren(p);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const sku = getProductSku(config.defaultsku);

  // the authored rows (defaultSku) stay in the DOM, hidden, so the block keeps its
  // Universal Editor instrumentation and the SKU stays editable
  const source = div('source', ...block.children);
  source.hidden = true;
  const content = div('content');
  block.replaceChildren(content, source);

  if (!sku) {
    message(content, IS_UE ? 'Informe o SKU do produto nas propriedades do bloco.' : 'Produto não encontrado.');
    return;
  }

  const alert = div('alert');
  alert.setAttribute('role', 'status');
  alert.setAttribute('aria-live', 'polite');
  content.append(
    alert,
    div('wrapper', div('gallery'), div('info', ...PARTS.map((name) => div(name)))),
  );
  const $ = (name) => content.querySelector(`.product-details-${name}`);

  try {
    await initializeCommerce();
    const [
      pdpApi, { render }, { initializers }, components, { h }, { events },
    ] = await Promise.all([
      import('@dropins/storefront-pdp/api.js'),
      import('@dropins/storefront-pdp/render.js'),
      import('@dropins/tools/initializer.js'),
      import('@dropins/tools/components.js'),
      import('@dropins/tools/preact.js'),
      import('@dropins/tools/event-bus.js'),
    ]);

    pdpApi.setEndpoint(CS_FETCH_GRAPHQL);
    const product = await pdpApi.fetchProductData(sku, { skipTransform: true });
    if (!product?.sku) {
      message(content, `Produto "${sku}" não encontrado no catálogo.`, 'error');
      return;
    }
    await initializers.mountImmediately(pdpApi.initialize, {
      sku,
      langDefinitions: { default: LABELS },
      models: { ProductDetails: { initialData: { ...product } } },
    });

    const containers = await Promise.all([
      'ProductGallery', 'ProductHeader', 'ProductPrice', 'ProductShortDescription',
      'ProductOptions', 'ProductQuantity', 'ProductDescription', 'ProductAttributes',
    ].map((name) => import(`@dropins/storefront-pdp/containers/${name}.js`).then((m) => m.default)));
    const [
      Gallery, Header, Price, ShortDescription, Options, Quantity, Description, Attributes,
    ] = containers;

    await Promise.all([
      render.render(Gallery, {
        controls: 'thumbnailsColumn', arrows: true, peak: false, gap: 'small', loop: false, imageParams: IMAGE_PARAMS,
      })($('gallery')),
      render.render(Header, {})($('header')),
      render.render(Price, {})($('price')),
      render.render(ShortDescription, {})($('short-description')),
      render.render(Options, { hideSelectedValue: false })($('options')),
      render.render(Quantity, {})($('quantity')),
      render.render(Description, {})($('description')),
      render.render(Attributes, {})($('attributes')),
    ]);

    // Add to cart (cart drop-in, guest cart on the demo backend)
    const { Button, Icon, provider: UI } = components;
    const $alert = $('alert');
    const label = 'Adicionar ao carrinho';
    const button = await UI.render(Button, {
      children: label,
      icon: h(Icon, { source: 'Cart' }),
      disabled: !pdpApi.isProductConfigurationValid(),
      onClick: async () => {
        button.setProps((prev) => ({ ...prev, children: 'Adicionando...', disabled: true }));
        $alert.className = 'product-details-alert';
        try {
          if (!pdpApi.isProductConfigurationValid()) throw new Error('Selecione as opções do produto.');
          await initializeCart();
          const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
          const cart = await addProductsToCart([{ ...pdpApi.getProductConfigurationValues() }]);
          $alert.classList.add('is-success');
          const total = cart?.totalQuantity ?? 1;
          $alert.textContent = `Produto adicionado ao carrinho (${total} ${total === 1 ? 'item' : 'itens'}).`;
        } catch (error) {
          $alert.classList.add('is-error');
          $alert.textContent = `Não foi possível adicionar ao carrinho: ${error.message}`;
        } finally {
          const disabled = !pdpApi.isProductConfigurationValid();
          button.setProps((prev) => ({ ...prev, children: label, disabled }));
        }
      },
    })($('add-to-cart'));

    events.on('pdp/valid', (valid) => {
      button.setProps((prev) => ({ ...prev, disabled: !valid }));
    }, { eager: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('product-details:', error);
    message(content, 'Não foi possível carregar o produto no momento.', 'error');
  }
}
