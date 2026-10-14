import { moveInstrumentation } from '../../scripts/ue-utils.js';
import { optimizePicture } from '../../scripts/dm-images.js';

/**
 * Cards Tagged: image-less cards variant with a tag pill, text and a link.
 * Each row = one card: [tag | text + link]. A single cell whose first
 * paragraph is the tag also works. An optional image cell is rendered on top.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-tagged-card';
    moveInstrumentation(row, li);

    // keep empty cells: new items added in the editor start empty and must stay selectable
    const cells = [...row.children];
    const imageCell = cells.find((cell) => cell.querySelector('picture') && !cell.textContent.trim());
    const textCells = cells.filter((cell) => cell !== imageCell);

    if (imageCell) {
      imageCell.className = 'cards-tagged-card-image';
      const img = imageCell.querySelector('picture > img');
      if (img) optimizePicture(img, false, [{ width: '750' }]);
      li.append(imageCell);
    }

    let tag = null;
    let body = null;
    if (textCells.length > 1) {
      [tag, body] = textCells;
      textCells.slice(2).forEach((cell) => body.append(...cell.childNodes));
    } else {
      [body] = textCells;
      const first = body?.firstElementChild;
      if (first && first.tagName === 'P' && !first.querySelector('a') && body.children.length > 1) {
        first.classList.add('cards-tagged-card-tag');
      }
    }

    if (tag) {
      tag.className = 'cards-tagged-card-tag';
      li.append(tag);
    }
    if (body) {
      body.className = 'cards-tagged-card-body';
      const last = body.lastElementChild;
      if (last && last.querySelector('a') && last.children.length === 1 && !last.classList.contains('cards-tagged-card-tag')) {
        last.classList.add('cards-tagged-card-link');
        last.classList.remove('button-wrapper', 'button-container');
        last.querySelector('a').classList.remove('button', 'primary', 'secondary', 'accent');
      }
      li.append(body);
    }
    ul.append(li);
  });
  block.replaceChildren(ul);
}
