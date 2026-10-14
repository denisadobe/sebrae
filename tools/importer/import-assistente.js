/* eslint-disable */
/* global WebImporter */

/**
 * /assistente (commerce branch): full-page Adobe Brand Concierge.
 * Source: https://sebrae.com.br/ (only used as the import entry point — the page is a thin
 * shell: intro copy + the brand-concierge block; the chat itself loads at runtime).
 */

function h(document, tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}

export default {
  transform: ({ document }) => {
    const main = document.body;
    main.innerHTML = '';
    main.append(
      h(document, 'h1', 'Assistente Sebrae'),
      h(document, 'p', 'Tire suas dúvidas sobre como abrir, gerenciar e expandir o seu negócio. O assistente responde na hora e indica cursos, conteúdos e soluções do Sebrae.'),
      WebImporter.DOMUtils.createTable([['Brand Concierge'], ['Assistente Sebrae']], document),
      document.createElement('hr'),
      WebImporter.DOMUtils.createTable([
        ['Metadata'],
        ['Title', 'Assistente Sebrae | Sebrae'],
        ['Description', 'Converse com o assistente virtual do Sebrae.'],
        ['Template', 'assistente'],
      ], document),
    );
    return [{ element: main, path: '/assistente' }];
  },
};
