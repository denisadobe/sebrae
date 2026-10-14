/*
 * Sebrae product card helpers (commerce branch), modelled on the cards of
 * loja.sebrae.com.br: 16:9 image, "Curso online / Tema" eyebrow, bold name,
 * availability + price ("Gratuito" when the price is zero).
 */
import { getProductLink } from './commerce.js';

// eyebrow topic colours used on loja.sebrae.com.br (by keyword)
const TONES = [
  [/finan/i, 'green'],
  [/marketing|vendas|mercado/i, 'purple'],
  [/pessoas|lideran/i, 'red'],
  [/empreend|inova/i, 'orange'],
  [/leis|jur[ií]d/i, 'teal'],
];

const el = (tag, className, ...children) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  e.append(...children.filter((c) => c !== null && c !== undefined));
  return e;
};

/** Price label: "Gratuito" for zero, otherwise the amount in pt-BR format. */
export function formatPrice(product) {
  const price = product.price?.final?.amount
    || product.priceRange?.minimum?.final?.amount;
  if (!price || typeof price.value !== 'number') return '';
  if (price.value === 0) return 'Gratuito';
  const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: price.currency || 'BRL' }).format(price.value);
  return product.priceRange && product.typename !== 'SimpleProductView' ? `A partir de ${amount}` : amount;
}

/** "Curso online / Tema" eyebrow; the part after "/" is the coloured topic. */
export function eyebrow(label) {
  const [kind, topic] = String(label || 'Curso online').split('/').map((s) => s.trim());
  const p = el('p', 'product-card-eyebrow', el('span', '', topic ? `${kind} / ` : kind));
  if (topic) {
    const tone = TONES.find(([re]) => re.test(topic))?.[1] || 'blue';
    p.append(el('strong', `product-card-topic product-card-topic-${tone}`, topic));
  }
  return p;
}

export const availability = (product) => el(
  'span',
  `product-card-meta${product.inStock === false ? ' is-out' : ''}`,
  product.inStock === false ? 'Esgotado' : 'Inscrições abertas',
);

export const priceTag = (product) => el('span', 'product-card-price', formatPrice(product));

/** Full card (used by the showcase). */
export function productCard(product, label, imageWidth = 600) {
  const href = getProductLink(product.sku);
  const src = product.images?.[0]?.url;
  const image = el('div', 'product-card-image');
  if (src) {
    const img = el('img');
    img.src = `${src.replace(/^http:/, 'https:')}?auto=webp&quality=80&crop=false&fit=cover&width=${imageWidth}`;
    img.alt = product.name;
    img.loading = 'lazy';
    img.width = 288;
    img.height = 162;
    image.append(img);
  }
  const name = el('a', 'product-card-name', product.name);
  name.href = href;
  return el(
    'div',
    'product-card',
    image,
    el(
      'div',
      'product-card-body',
      eyebrow(label),
      el('h3', 'product-card-title', name),
      el('div', 'product-card-footer', availability(product), priceTag(product)),
    ),
  );
}
