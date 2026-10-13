import { moveInstrumentation } from '../../scripts/ue-utils.js';

/**
 * Stats: big highlighted numbers with a short label.
 * Each row = one stat: [number | label (rich text)]. A lone cell is treated as the label.
 * Authored cells are kept so Universal Editor instrumentation survives.
 * @param {Element} block
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const item = document.createElement('li');
    item.className = 'stats-item';
    moveInstrumentation(row, item);
    const [number, label] = [...row.children];
    if (number && label) {
      number.className = 'stats-number';
      label.className = 'stats-label';
      item.append(number, label);
    } else if (number) {
      number.className = 'stats-label';
      item.append(number);
    }
    list.append(item);
  });
  block.replaceChildren(list);
}
