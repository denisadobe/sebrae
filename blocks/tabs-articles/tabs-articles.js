import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/ue-utils.js';

/**
 * Tabs Articles: tabs variant whose panels hold intro text plus a row of article items.
 * Each row = one tab: [tab label | heading + text + link + list of article items].
 * The content cell is kept untouched (only classes are added) so it stays editable
 * as rich text; CSS lays the intro and the article list side by side.
 * @param {Element} block
 */

let tabsId = 0;

function decoratePanelContent(content) {
  content.className = 'tabs-articles-panel-content';
  content.querySelectorAll(':scope > ul, :scope > ol').forEach((list) => {
    list.classList.add('tabs-articles-list');
    [...list.children].forEach((li) => li.classList.add('tabs-articles-item'));
  });
  if (content.querySelector(':scope > .tabs-articles-list')) {
    content.classList.add('tabs-articles-panel-content-has-items');
  }
}

const CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10.5 4 6 8l4.5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Adds a "1 de N" pager with prev/next buttons for the article row.
 * Appended to the panel row (outside the rich text cell), so the cell stays untouched.
 * @param {Element} panel the tab panel row
 * @param {Element} list the article list (scroll container)
 */
function decoratePager(panel, list) {
  const pager = document.createElement('div');
  pager.className = 'tabs-articles-pager';
  pager.hidden = true;
  const label = document.createElement('div');
  label.className = 'tabs-articles-pager-label';
  label.setAttribute('aria-live', 'polite');
  const items = document.createElement('div');
  items.className = 'tabs-articles-pager-items';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'tabs-articles-pager-prev';
  prev.setAttribute('aria-label', 'Anterior');
  prev.innerHTML = CHEVRON;
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'tabs-articles-pager-next';
  next.setAttribute('aria-label', 'Próximo');
  next.innerHTML = CHEVRON.replace('M10.5 4 6 8l4.5 4', 'M5.5 4 10 8l-4.5 4');
  items.append(prev, next);
  pager.append(label, items);
  panel.append(pager);

  const step = () => {
    const item = list.querySelector('.tabs-articles-item');
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    return item ? item.offsetWidth + gap : list.clientWidth;
  };
  const update = () => {
    const s = step();
    if (!s) return;
    const pages = Math.max(1, Math.round((list.scrollWidth - list.clientWidth) / s) + 1);
    const current = Math.min(pages, Math.round(list.scrollLeft / s) + 1);
    label.textContent = `${current} de ${pages}`;
    prev.disabled = current <= 1;
    next.disabled = current >= pages;
    pager.hidden = pages <= 1;
  };

  prev.addEventListener('click', () => list.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => list.scrollBy({ left: step(), behavior: 'smooth' }));
  let ticking = false;
  list.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });
  new ResizeObserver(update).observe(list);
}

/**
 * Activates a tab (also used by the Universal Editor when a panel is selected).
 * @param {Element} block the tabs block
 * @param {Element} tabpanel the panel to show
 */
export function showTab(block, tabpanel) {
  block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
    panel.setAttribute('aria-hidden', panel !== tabpanel);
  });
  block.querySelectorAll('[role=tab]').forEach((btn) => {
    btn.setAttribute('aria-selected', btn.getAttribute('aria-controls') === tabpanel.id);
  });
}

export default function decorate(block) {
  tabsId += 1;
  const tablist = document.createElement('div');
  tablist.className = 'tabs-articles-list-tabs';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children].filter((row) => row.firstElementChild);
  rows.forEach((row, i) => {
    const [tab, ...cells] = [...row.children];
    const id = `${tabsId}-${toClassName(tab.textContent) || i}`;

    const tabpanel = row;
    tabpanel.className = 'tabs-articles-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    let [content] = cells;
    if (!content) {
      content = document.createElement('div');
      row.append(content);
    }
    cells.slice(1).forEach((cell) => {
      content.append(...cell.childNodes);
      cell.remove();
    });
    decoratePanelContent(content);
    const list = content.querySelector(':scope > .tabs-articles-list');
    if (list) decoratePager(tabpanel, list);

    const button = document.createElement('button');
    button.className = 'tabs-articles-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;
    moveInstrumentation(tab, button);
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => showTab(block, tabpanel));
    tablist.append(button);
    tab.remove();
  });

  block.prepend(tablist);
}
