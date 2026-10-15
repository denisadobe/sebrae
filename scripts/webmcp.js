/*
 * WebMCP tools (https://github.com/webmachinelearning/webmcp): lets in-browser AI agents
 * search the course catalog, read a course and use the cart without driving the UI.
 * Registration is a no-op in browsers without document.modelContext, and the commerce code
 * is only loaded when an agent actually calls a tool.
 */

const SEARCH_QUERY = `query AgentSearch($phrase: String!, $filter: [SearchClauseInput!], $size: Int) {
  productSearch(phrase: $phrase, page_size: $size, filter: $filter) {
    total_count
    items {
      productView {
        __typename sku name inStock shortDescription
        ... on SimpleProductView { price { final { amount { value currency } } } }
        ... on ComplexProductView { priceRange { minimum { final { amount { value currency } } } } }
      }
    }
  }
}`;

const VISIBILITY = { attribute: 'visibility', in: ['Search', 'Catalog, Search'] };
const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] });
const strip = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function commerce() {
  const module = await import('./commerce.js');
  await module.initializeCommerce();
  return module;
}

async function searchProducts({
  phrase = '', category, skus, size = 10,
}) {
  const { CS_FETCH_GRAPHQL, getProductLink } = await commerce();
  const { formatPrice } = await import('./product-card.js');
  const filter = [VISIBILITY];
  if (skus?.length) filter.push({ attribute: 'sku', in: skus });
  if (category) filter.push({ attribute: 'categoryPath', eq: category });
  const { data, errors } = await CS_FETCH_GRAPHQL.fetchGraphQl(SEARCH_QUERY, {
    variables: { phrase, filter, size },
  });
  if (errors?.length) throw new Error(errors[0].message);
  return {
    total: data?.productSearch?.total_count || 0,
    items: (data?.productSearch?.items || []).map(({ productView: p }) => ({
      sku: p.sku,
      name: p.name,
      // eslint-disable-next-line no-underscore-dangle
      price: formatPrice({ ...p, typename: p.__typename }),
      available: p.inStock !== false,
      summary: strip(p.shortDescription).slice(0, 240),
      // eslint-disable-next-line no-underscore-dangle
      requiresOptions: p.__typename === 'ComplexProductView',
      url: new URL(getProductLink(p.sku), window.location.origin).href,
    })),
  };
}

const TOOLS = [
  {
    name: 'buscar-cursos',
    description: 'Busca cursos e soluções no catálogo do Sebrae por palavra-chave e/ou categoria. Retorna nome, SKU, preço ("Gratuito" quando não há custo), disponibilidade e link de cada item.',
    inputSchema: {
      type: 'object',
      properties: {
        termo: { type: 'string', description: 'Palavra-chave da busca, por exemplo "marketing" ou "finanças". Vazio lista o catálogo.' },
        categoria: { type: 'string', description: 'Caminho da categoria no catálogo, por exemplo "apparel", "office" ou "lifestyle" (opcional).' },
        limite: {
          type: 'integer', description: 'Quantidade máxima de resultados (1 a 20, padrão 10).', minimum: 1, maximum: 20,
        },
      },
    },
    async execute({ termo = '', categoria, limite = 10 } = {}) {
      return text(await searchProducts({
        phrase: termo, category: categoria, size: Math.min(20, Math.max(1, limite)),
      }));
    },
  },
  {
    name: 'detalhes-do-curso',
    description: 'Retorna os detalhes de um curso ou solução do catálogo do Sebrae a partir do SKU: nome, preço, disponibilidade, resumo e link da página.',
    inputSchema: {
      type: 'object',
      properties: { sku: { type: 'string', description: 'SKU do curso, por exemplo "ADB228".' } },
      required: ['sku'],
    },
    async execute({ sku }) {
      const { items } = await searchProducts({ skus: [sku], size: 1 });
      return text(items[0] || `Nenhum curso encontrado com o SKU "${sku}".`);
    },
  },
  {
    name: 'adicionar-ao-carrinho',
    description: 'Adiciona um curso ou solução ao carrinho do visitante. Itens com opções (tamanho, cor etc.) precisam ser configurados na página do produto.',
    inputSchema: {
      type: 'object',
      properties: {
        sku: { type: 'string', description: 'SKU do curso a adicionar.' },
        quantidade: {
          type: 'integer', description: 'Quantidade (padrão 1).', minimum: 1, maximum: 10,
        },
      },
      required: ['sku'],
    },
    async execute({ sku, quantidade = 1 }) {
      const { items } = await searchProducts({ skus: [sku], size: 1 });
      const product = items[0];
      if (!product) return text(`Nenhum curso encontrado com o SKU "${sku}".`);
      if (product.requiresOptions) {
        return text(`"${product.name}" tem opções a escolher. Abra a página do produto para configurar: ${product.url}`);
      }
      const { initializeCart } = await commerce();
      await initializeCart();
      const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
      const cart = await addProductsToCart([{ sku: product.sku, quantity: quantidade }]);
      return text(`"${product.name}" foi adicionado ao carrinho. Total de itens: ${cart?.totalQuantity ?? quantidade}.`);
    },
  },
  {
    name: 'ver-carrinho',
    description: 'Lista os itens do carrinho do visitante com quantidades e subtotal.',
    inputSchema: { type: 'object', properties: {} },
    async execute() {
      const { initializeCart, CART_PAGE } = await commerce();
      await initializeCart();
      const cartApi = await import('@dropins/storefront-cart/api.js');
      const cart = cartApi.getCartDataFromCache?.() || await cartApi.getCartData?.();
      if (!cart?.totalQuantity) return text('O carrinho está vazio.');
      return text({
        totalItens: cart.totalQuantity,
        subtotal: cart.subtotal?.excludingTax ?? cart.subtotal?.includingTax,
        itens: (cart.items || []).map((i) => ({
          sku: i.sku, nome: i.name, quantidade: i.quantity,
        })),
        link: new URL(CART_PAGE, window.location.origin).href,
      });
    },
  },
];

export default async function registerWebMcpTools() {
  const context = document.modelContext || navigator.modelContext;
  if (!context?.registerTool) return;
  await Promise.all(TOOLS.map((tool) => context.registerTool(tool).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn(`WebMCP: could not register ${tool.name}`, e);
  })));
}
