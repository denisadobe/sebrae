import { moveInstrumentation } from '../../scripts/ue-utils.js';
import { decorateIconCell } from '../../scripts/block-utils.js';

/**
 * Cards Compact: cards variant with a small icon inline with the title.
 * Each row = one card: [icon (image or icon name) | heading + text + link].
 * The heading stays inside the body cell (keeps rich text editing intact);
 * CSS places the icon next to it.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-compact-card';
    moveInstrumentation(row, li);
    const cells = [...row.children];
    const iconCell = cells.length > 1 ? cells[0] : null;
    const bodyCells = cells.length > 1 ? cells.slice(1) : cells;

    if (iconCell) {
      iconCell.className = 'cards-compact-card-icon';
      if (decorateIconCell(iconCell, 96)) {
        li.append(iconCell);
        li.classList.add('cards-compact-card-has-icon');
      }
    }

    const [body, ...extra] = bodyCells;
    if (body) {
      extra.forEach((cell) => body.append(...cell.childNodes));
      body.className = 'cards-compact-card-body';
      const last = body.lastElementChild;
      if (last && last.tagName === 'P' && last.querySelector('a') && last.children.length === 1) {
        last.classList.add('cards-compact-card-link');
        last.querySelector('a').classList.remove('button', 'primary', 'secondary', 'accent');
        last.classList.remove('button-wrapper', 'button-container');
      }
      li.append(body);
    }
    ul.append(li);
  });
  block.replaceChildren(ul);
}
