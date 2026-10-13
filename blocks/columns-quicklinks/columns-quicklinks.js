import { moveInstrumentation } from '../../scripts/ue-utils.js';

/**
 * Columns Quicklinks: columns variant rendering a single bar of quick links.
 * Authored as one row per link (one cell each); a single row with N cells also works.
 * @param {Element} block
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'columns-quicklinks-row';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    cells.forEach((cell) => {
      // drop empty cells authors may leave behind
      if (!cell.textContent.trim() && !cell.querySelector('picture, img')) return;
      const item = document.createElement('li');
      item.className = 'columns-quicklinks-item';
      // one cell per row: the row is the editable item; otherwise the cell is
      moveInstrumentation(cells.length === 1 ? row : cell, item);
      item.append(cell);
      const link = cell.querySelector('a');
      if (link) {
        link.classList.add('columns-quicklinks-link');
        // unwrap button styling — this is a plain link bar
        link.classList.remove('button', 'primary', 'secondary', 'accent');
        link.closest('.button-wrapper, .button-container')?.classList.remove('button-wrapper', 'button-container');
      }
      list.append(item);
    });
  });

  block.classList.add(`columns-quicklinks-${list.children.length}-cols`);
  block.replaceChildren(list);
}
