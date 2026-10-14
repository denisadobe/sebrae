/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the "Seu interesse" lead form. Source: https://sebrae.com.br/ (section `.embed__wrapper`).
 * The source renders the form inside a cross-origin iframe (cloud.cliente.sebrae.com.br/seuinteressev2),
 * whose DOM is not readable from the page, so the definition below was extracted from that iframe
 * (labels, placeholders, required markers, every option of the state / interest / segment lists).
 * Output: default content (h2 + image) followed by a `form` block — one row per field:
 *   [type | label | name | placeholder | options | required]
 */
const FORM_URL = 'https://cloud.cliente.sebrae.com.br/seuinteressev2';
const HEADING = 'Receba novidades e o melhor dos nossos conteúdos por E-mail e WhatsApp. É grátis!';
const IMAGE = 'https://image.cliente.sebrae.com.br/lib/fe2f11727364047c771d77/m/1/fcd6cc99-46a3-4973-aec6-07eea2ceacc6.png';

const STATES = ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espirito Santo', 'Goiás', 'Maranhão', 'Mato Grosso do Sul', 'Mato Grosso', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Sul', 'Rio Grande do Norte', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'];
const INTERESTS = ['Abertura de Negócios e Empreendedorismo', 'Educação Empreendedora', 'Finanças', 'Gestão de Pessoas', 'Inovação', 'Leis', 'MEI', 'Marketing', 'Mercado e Vendas', 'Organização e Planejamento'];
const SEGMENTS = ['Agronegócios', 'Alimentos e Bebidas', 'Artesanato', 'Beleza', 'Bioeconomia', 'Casas e Construção', 'Economia Criativa', 'Energia', 'Mercado Digital', 'Moda', 'Negócios Pet', 'Saúde e Bem-Estar', 'Startups', 'Turismo', 'Varejo'];

const FIELDS = [
  ['text', 'Nome', 'nome', 'Digite o seu nome', '', 'sim'],
  ['email', 'E-mail', 'email', 'Seu melhor e-mail', '', 'sim'],
  ['tel', 'Telefone', 'telefone', 'DDD + telefone', '', 'sim'],
  ['select', 'Seu estado', 'estado', 'Selecione seu estado', STATES.join(', '), 'sim'],
  ['multiselect', 'Conteúdo(s) do seu interesse', 'interesses', 'Selecione...', INTERESTS.join(', '), 'sim'],
  ['multiselect', 'Segmento(s) do(s) meu(s) negócio(s)', 'segmentos', 'Selecione...', SEGMENTS.join(', '), 'sim'],
  ['checkbox', 'Aceito receber os conteúdos exclusivos do Sebrae por WhatsApp, E-mail e SMS', 'aceite_comunicacao', '', '', 'sim'],
  ['submit', 'Enviar dados', '', 'Obrigado! Em breve você vai receber as novidades do Sebrae.', '', ''],
];

export default function parse(element, { document }) {
  const iframe = element.querySelector('iframe');
  if (iframe && !(iframe.getAttribute('src') || '').startsWith(FORM_URL)) {
    // a different embed: keep it as an embed block
    const a = document.createElement('a');
    a.href = iframe.getAttribute('src');
    a.textContent = a.href;
    element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'embed-iframe', cells: [[a]] }));
    return;
  }
  const h2 = document.createElement('h2');
  h2.textContent = HEADING;
  const img = document.createElement('img');
  img.src = IMAGE;
  img.alt = 'Homem sorrindo enquanto usa o celular';
  const p = document.createElement('p');
  p.append(img);
  const block = WebImporter.Blocks.createBlock(document, { name: 'form', cells: FIELDS.map((row) => row.slice()) });
  element.replaceWith(h2, p, block);
}
