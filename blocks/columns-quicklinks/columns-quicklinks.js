/**
 * Columns Quicklinks: columns variant rendering a single bar of quick links.
 * Authored as ONE cell holding a bulleted list of links (one list item per quick link), so the
 * whole bar is a single rich text field in Universal Editor (add/remove links in the list).
 * The authored cell is kept in place; only classes are added so editor instrumentation survives.
 * Legacy content (one link per row or per cell) is folded into that list.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const cell = rows[0] && rows[0].firstElementChild;
  if (!cell) return;

  let list = cell.querySelector('ul, ol');
  if (!list) {
    list = document.createElement('ul');
    block.querySelectorAll('a').forEach((a) => {
      const li = document.createElement('li');
      li.append(a);
      list.append(li);
    });
    cell.replaceChildren(list);
    rows.slice(1).forEach((row) => row.remove());
  }

  cell.classList.add('columns-quicklinks-cell');
  list.classList.add('columns-quicklinks-row');
  [...list.children].forEach((li) => li.classList.add('columns-quicklinks-item'));
  list.querySelectorAll('a').forEach((a) => {
    a.classList.add('columns-quicklinks-link');
    // plain link bar: undo button styling from decorateButtons
    a.classList.remove('button', 'primary', 'secondary', 'accent');
    const wrapper = a.closest('.button-wrapper, .button-container');
    if (wrapper) wrapper.classList.remove('button-wrapper', 'button-container');
  });

  block.classList.add(`columns-quicklinks-${list.children.length}-cols`);
  // keep an empty bar visible so it can still be selected (and deleted) in the editor
  if (!list.querySelector('a')) block.classList.add('columns-quicklinks-empty');
}
