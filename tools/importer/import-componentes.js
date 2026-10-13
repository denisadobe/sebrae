/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the /componentes showcase page (demo of every block not used on the home).
 * Run against https://sebrae.com.br/sobre-nos — hero, quote, table and stats are read from that
 * page; the remaining copy is taken verbatim from other sebrae.com.br pages:
 *   - FAQ: /empreendedores/guiaparaomei/querosermei/o-que-e-mei-e-como-funciona-
 *   - video: ALI programme video embedded on /subsites/ali
 *   - cards: articles listed on the home page (Artigos tab)
 *   - CTAs: footer contact data, MEI guide and "Cursos e Eventos" menu
 */

const SEBRAE = 'https://sebrae.com.br';
const S7 = 'https://sebrae.scene7.com/is/image/sebrae';

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

function h(document, tag, content) {
  const e = document.createElement(tag);
  if (typeof content === 'string') e.textContent = content;
  else if (content) e.append(...[].concat(content));
  return e;
}

function link(document, href, label, strong = false) {
  const a = h(document, 'a', label);
  a.href = href;
  if (!strong) return a;
  return h(document, 'strong', a);
}

function img(document, src, alt) {
  const i = document.createElement('img');
  i.src = src;
  i.alt = alt || '';
  return i;
}

function block(document, name, cells) {
  return WebImporter.Blocks.createBlock(document, { name, cells });
}

function sectionMeta(document, style) {
  return WebImporter.Blocks.createBlock(document, { name: 'Section Metadata', cells: { style } });
}

/** paragraph following a heading with the given text on the source page */
function paragraphAfter(document, selector, label) {
  const heading = [...document.querySelectorAll(selector)].find((e) => text(e) === label);
  if (!heading) return '';
  let el = heading;
  for (let i = 0; i < 6 && el; i += 1) {
    const p = el.parentElement && el.parentElement.querySelector('p');
    if (p && text(p)) return text(p);
    el = el.parentElement;
  }
  return '';
}

const FAQ = [
  ['O que é MEI?', [
    'MEI significa Microempreendedor Individual e é a forma mais simples de um empreendedor formalizar seu negócio, ter um CNPJ e se tornar um profissional autônomo.',
    'Com o MEI, você pode recolher impostos, emitir notas fiscais e até contratar um funcionário. Tudo isso com um esquema tributário muito mais simples.',
  ]],
  ['Como funciona o MEI?', [
    'Para abrir seu MEI, você não precisa de um contador ou qualquer intermediário. Você mesmo pode começar essa nova etapa de forma online e sem pagar nada por isso.',
    'Após a formalização, o MEI deve pagar mensalmente um valor fixo de impostos e cumprir com algumas obrigações acessórias, como a entrega da Declaração Anual do Simples Nacional (DASN-SIMEI).',
  ]],
  ['Como funciona o MEI Caminhoneiro?', [
    'O MEI Caminhoneiro é uma modalidade do MEI destinada aos profissionais que trabalham com transporte de cargas.',
    'A modalidade MEI Caminhoneiro garante benefícios previdenciários, como aposentadoria, auxílio-doença, salário-maternidade, auxílio-reclusão, bem como possibilita a emissão de nota fiscal e facilidade de acesso a crédito.',
  ]],
  ['Como abrir um MEI?', [
    'O registro como Microempreendedor Individual (MEI), é um processo simples, fácil, completamente online e gratuito.',
  ]],
];

const STATS = [
  ['50 anos', 'Em 2022 o Sebrae completou 50 anos, consolidado como uma das maiores instituições de fomento ao empreendedorismo do mundo.'],
  ['1.200', 'Consultores formados pelo Cebrae em 1979, quando a iniciativa se consolidou em quase todo o país.'],
  ['30 anos', 'Do Fundo de Aval para as Micro e Pequenas Empresas (FAMPE), celebrados em 2025.'],
  ['20 anos', 'Da Lei Geral da Micro e Pequena Empresa e da criação do Simples Nacional, celebrados em 2026.'],
];

const ARTICLES = [
  ['shutterstock_1041718081', 'Mercado e Vendas', 'Descomplicando o Marketing Digital: Guia Prático para Empresários', '/empreendedores/conteudos/comecar/marketing-digital-guia-empresario', 'Desvende o universo do Marketing Digital com nosso Guia Prático para Empresários.'],
  ['shutterstock_1713933655', 'Mercado e Vendas', 'Como vender pelas mídias sociais?', '/empreendedores/conteudos/comecar/pilar-vender-midias-sociais', 'Descubra estratégias eficazes para vender pelas mídias sociais.'],
  ['shutterstock_2469222045', 'MEI', 'Atividades permitidas no MEI', '/empreendedores/guiaparaomei/querosermei/atividades-permitidas-no-mei', 'Para ser um Microempreendedor Individual, a sua atividade precisa constar na lista de ocupações permitidas pelo MEI.'],
];

export default {
  transform: ({ document }) => {
    const sections = [];
    const add = (...nodes) => sections.push(nodes.filter(Boolean));

    // values read from /sobre-nos
    const heroTitle = text([...document.querySelectorAll('h1')].find((e) => /força do empreendedor/i.test(e.textContent))) || 'A força do empreendedor brasileiro';
    const heroText = paragraphAfter(document, 'h1', heroTitle)
      || 'A força capaz de mover o país vem de cada empreendedor que arregaça as mangas e faz acontecer.';
    const guide = ['Propósito', 'Missões', 'Valores'].map((k) => [k, paragraphAfter(document, 'h2', k)]);
    const whoWeAre = paragraphAfter(document, 'h2', 'Quem somos');

    // 1. hero (boilerplate hero)
    add(block(document, 'Hero', [[[img(document, `${S7}/Hero-3?bfc=webp&fmt=png-alpha`, 'Empreendedores brasileiros'), h(document, 'h1', heroTitle), h(document, 'p', heroText)]]]));

    // 2. intro (default content)
    add(
      h(document, 'h2', 'Biblioteca de componentes'),
      h(document, 'p', 'Página de demonstração com os componentes do portal que não aparecem na home. Todos podem ser adicionados, editados e reordenados pelo Universal Editor.'),
    );

    // 3. stats
    add(h(document, 'h2', 'Números em destaque'), block(document, 'Stats', STATS.map(([n, l]) => [n, h(document, 'p', l)])));

    // 4. FAQ accordion (light section)
    add(
      sectionMeta(document, 'light'),
      h(document, 'h2', 'Perguntas frequentes sobre o MEI'),
      block(document, 'Accordion', FAQ.map(([q, ps]) => [q, ps.map((t) => h(document, 'p', t))])),
    );

    // 5. table (striped variant)
    add(
      h(document, 'h2', 'O que guia o Sebrae'),
      block(document, 'Table (striped)', [['Pilar', 'Descrição'], ...guide.filter(([, d]) => d)]),
    );

    // 6. quote
    add(block(document, 'Quote', [[h(document, 'p', heroText.split('. ').slice(1).join('. ') || heroText)], [h(document, 'p', [document.createTextNode('Sebrae, '), h(document, 'em', 'Quem somos')])]]));

    // 7. video
    add(
      h(document, 'h2', 'ALI - Agentes Locais de Inovação'),
      h(document, 'p', 'Com o Programa ALI você recebe suporte de profissionais especializados e acompanhamento sob medida pro seu negócio inovar e crescer.'),
      block(document, 'Video', [[h(document, 'p', link(document, 'https://www.youtube.com/watch?v=1jkfjcXyhO0', 'https://www.youtube.com/watch?v=1jkfjcXyhO0'))]]),
    );

    // 8. columns (boilerplate columns)
    add(block(document, 'Columns', [[
      [h(document, 'h2', 'Quem somos'), h(document, 'p', whoWeAre || 'O Sebrae apoia as pequenas empresas em todo o Brasil oferecendo orientação, capacitação e soluções para quem quer empreender.'), h(document, 'p', link(document, `${SEBRAE}/sobre-nos`, 'Conheça o Sebrae', true))],
      img(document, `${S7}/ali-image?bfc=webp&fmt=png-alpha&crop=0%2C59%2C784%2C441`, 'Agente local de inovação atendendo empreendedora'),
    ]]));

    // 9. cards (boilerplate cards)
    add(
      h(document, 'h2', 'Conteúdos para o seu negócio'),
      block(document, 'Cards', ARTICLES.map(([image, tag, title, href, desc]) => [
        img(document, `${S7}/${image}?bfc=webp&fmt=png-alpha`, title),
        [h(document, 'p', tag), h(document, 'h3', link(document, `${SEBRAE}${href}`, title)), h(document, 'p', desc)],
      ])),
    );

    // 10. CTA banners (3 colour variants)
    add(
      h(document, 'h2', 'Chamadas para ação'),
      block(document, 'Cta Banner', [[[h(document, 'h2', 'Fale com o Sebrae'), h(document, 'p', 'Central de Relacionamento: 0800 570 0800'), h(document, 'p', link(document, 'https://api.whatsapp.com/send?phone=5508005700800', 'Whatsapp', true)), h(document, 'p', link(document, `${SEBRAE}/subsites/atendimento-especializado`, 'Atendimento Especializado'))]]]),
      block(document, 'Cta Banner (navy)', [[[h(document, 'h2', 'Quero ser MEI'), h(document, 'p', FAQ[3][1][0]), h(document, 'p', link(document, `${SEBRAE}/empreendedores/guiaparaomei/querosermei/o-que-e-o-mei`, 'Quero ser MEI', true))]]]),
      block(document, 'Cta Banner (blue)', [[
        img(document, `${S7}/image-carousel-plataforma-ead?bfc=webp&fmt=png-alpha`, 'Plataforma EAD do Sebrae'),
        [h(document, 'h2', 'Cursos online - EAD'), h(document, 'p', 'Assista no seu computador, tablet ou celular'), h(document, 'p', link(document, 'https://loja.sebrae.com.br/cursos/cursos-online', 'Acessar plataforma', true))],
      ]]),
    );

    // 11. pointer to the home components
    add(
      h(document, 'h2', 'Componentes da home'),
      h(document, 'p', 'Hero com atalhos rápidos, cards com ícone, cards compactos, carrossel de destaques, abas de artigos, cards com etiqueta e o formulário incorporado estão na página inicial.'),
      h(document, 'p', link(document, '/', 'Ver a página inicial', true)),
    );

    // metadata
    const meta = WebImporter.Blocks.createBlock(document, {
      name: 'Metadata',
      cells: { Title: 'Componentes | Sebrae', Description: 'Biblioteca de componentes do portal Sebrae para demonstração no Universal Editor.' },
    });

    document.body.innerHTML = '';
    sections.forEach((nodes, i) => {
      if (i) document.body.append(document.createElement('hr'));
      document.body.append(...nodes);
    });
    document.body.append(meta);

    return [{ element: document.body, path: '/componentes', report: { title: 'componentes', sections: sections.length } }];
  },
};
