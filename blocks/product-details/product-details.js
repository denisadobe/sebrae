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

function message(block, text, type = 'info') {
  const p = document.createElement('p');
  p.className = `product-details-message product-details-message-${type}`;
  p.textContent = text;
  block.replaceChildren(p);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const sku = getProductSku(config.defaultsku);
  if (!sku) {
    message(block, IS_UE ? 'Informe o SKU do produto nas propriedades do bloco.' : 'Produto não encontrado.');
    return;
  }

  block.innerHTML = `
    <div class="product-details-alert" role="status" aria-live="polite"></div>
    <div class="product-details-wrapper">
      <div class="product-details-gallery"></div>
      <div class="product-details-info">
        <div class="product-details-header"></div>
        <div class="product-details-price"></div>
        <div class="product-details-short-description"></div>
        <div class="product-details-options"></div>
        <div class="product-details-quantity"></div>
        <div class="product-details-add-to-cart"></div>
        <div class="product-details-description"></div>
        <div class="product-details-attributes"></div>
      </div>
    </div>`;
  const $ = (name) => block.querySelector(`.product-details-${name}`);

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
      message(block, `Produto "${sku}" não encontrado no catálogo.`, 'error');
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
    message(block, 'Não foi possível carregar o produto no momento.', 'error');
  }
}
