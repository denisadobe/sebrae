import { moveInstrumentation } from '../../scripts/ue-utils.js';
import { decorateIconCell } from '../../scripts/block-utils.js';

/**
 * Cards Icon: cards variant with a small icon tile above the card body.
 * Each row = one card: [icon (image or icon name) | heading + text + link list + CTA].
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-icon-card';
    moveInstrumentation(row, li);
    const cells = [...row.children];
    // a lone cell is the body; with two or more, the first one is the icon
    const iconCell = cells.length > 1 ? cells[0] : null;
    const bodyCells = cells.length > 1 ? cells.slice(1) : cells;

    if (iconCell) {
      iconCell.className = 'cards-icon-card-icon';
      if (decorateIconCell(iconCell, 160)) li.append(iconCell);
    }

    const [body, ...extra] = bodyCells;
    if (body) {
      extra.forEach((cell) => body.append(...cell.childNodes));
      body.className = 'cards-icon-card-body';
      // the last standalone link in the body is the card CTA ("Mostrar tudo")
      const last = body.lastElementChild;
      if (last && last.tagName === 'P' && last.querySelector('a') && last.children.length === 1) {
        last.classList.add('cards-icon-card-cta');
      }
      body.querySelectorAll('ul').forEach((list) => list.classList.add('cards-icon-card-links'));
      li.append(body);
    }
    ul.append(li);
  });
  block.replaceChildren(ul);
}
