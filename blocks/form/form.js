/*
 * Form: native form built from authored rows (demo — submitting only shows a confirmation).
 * Each row = one field: [type | label | name | placeholder | options | required]
 *   type: text, email, tel, textarea, select, multiselect, checkbox, radio, heading, submit
 *   options: comma-separated (or one per list item / paragraph) for select, multiselect, radio
 *   required: sim / true / x
 *   submit row: label = button text, placeholder = confirmation message shown after "sending"
 * Rows and cells are decorated in place: the authored text itself becomes the labels, options
 * and button, so the rendered page carries no text that is missing from the server HTML
 * (AI agents read the same content as humans) and every cell stays editable in Universal Editor.
 */

const CELLS = ['type', 'label', 'name', 'placeholder', 'options', 'required'];
const DEFAULT_PLACEHOLDER = 'Selecione...';

let formId = 0;

const cellText = (cell) => (cell ? cell.textContent.replace(/\s+/g, ' ').trim() : '');

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === true) e.setAttribute(k, '');
    else if (v !== false && v !== undefined && v !== null && v !== '') e.setAttribute(k, v);
  });
  children.filter(Boolean).forEach((c) => e.append(c));
  return e;
}

// move the cell's authored content into a new element (label, button...) inside the cell
function wrapContents(cell, tag, attrs) {
  const wrapper = el(tag, attrs);
  if (!cell) return wrapper;
  // labels and buttons take phrasing content only: unwrap the <p> added around cell text
  cell.querySelectorAll(':scope > p').forEach((p) => p.replaceWith(...p.childNodes));
  wrapper.append(...cell.childNodes);
  cell.append(wrapper);
  return wrapper;
}

// option texts: one per list item / paragraph, or a single comma-separated line
function optionTexts(cell) {
  if (!cell) return [];
  const items = [...cell.querySelectorAll('li, p')];
  const values = items.length > 1 ? items.map((i) => i.textContent) : cell.textContent.split(',');
  return values.map((v) => v.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// turn the authored option text into choices, reusing the same words (and separators)
function decorateChoices(cell, type, name, id, required) {
  if (!cell) return [];
  const inputs = [];
  const choice = (text) => {
    const optId = `${id}-${inputs.length}`;
    const input = el('input', {
      type, id: optId, name, value: text, required: type === 'radio' && required,
    });
    inputs.push(input);
    return el('label', { class: 'form-option', for: optId }, input, text);
  };
  const items = [...cell.querySelectorAll('li, p')];
  if (items.length > 1) {
    items.forEach((item) => {
      const text = cellText(item);
      if (text) item.replaceChildren(choice(text));
    });
  } else {
    const host = items[0] || cell;
    const nodes = [];
    optionTexts(host).forEach((text, i) => {
      if (i) nodes.push(el('span', { class: 'form-option-sep' }, ', '));
      nodes.push(choice(text));
    });
    host.replaceChildren(...nodes);
  }
  return inputs;
}

function decorateMultiselect(row, cells, def, id) {
  const [, labelCell, , trigger, list] = cells;
  wrapContents(labelCell, 'span', { id: `${id}-label`, class: `form-label${def.required ? ' form-label-required' : ''}` });
  row.setAttribute('role', 'group');
  row.setAttribute('aria-labelledby', `${id}-label`);
  if (!trigger || !list) return;

  // placeholder cell = dropdown trigger; options cell = dropdown panel
  const placeholder = wrapContents(trigger, 'span', { class: 'form-multiselect-placeholder' });
  if (!def.placeholder) placeholder.dataset.placeholder = DEFAULT_PLACEHOLDER;
  const value = el('span', { class: 'form-multiselect-value' });
  trigger.append(value);
  trigger.id = `${id}-summary`;
  trigger.classList.add('form-multiselect-summary');
  list.id = `${id}-options`;
  list.classList.add('form-multiselect-options');
  Object.entries({
    role: 'button', tabindex: '0', 'aria-expanded': 'false', 'aria-controls': list.id, 'aria-labelledby': `${id}-label ${id}-summary`,
  }).forEach(([k, v]) => trigger.setAttribute(k, v));

  const inputs = decorateChoices(list, 'checkbox', def.name || id, id);
  const toggle = (open = !row.classList.contains('is-open')) => {
    row.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', open);
  };
  trigger.addEventListener('click', () => toggle());
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && row.classList.contains('is-open')) {
      toggle(false);
      trigger.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!row.contains(e.target)) toggle(false);
  });

  const update = () => {
    const chosen = inputs.filter((c) => c.checked).map((c) => c.value);
    value.textContent = chosen.join(', ');
    trigger.classList.toggle('has-value', chosen.length > 0);
    if (def.required && inputs[0]) inputs[0].setCustomValidity(chosen.length ? '' : 'Selecione ao menos uma opção.');
  };
  list.addEventListener('change', update);
  if (def.required && inputs[0]) inputs[0].setCustomValidity('Selecione ao menos uma opção.');
}

function decorateField(row, cells, def, id) {
  const labelCell = cells[1];
  const name = def.name || id;
  const requiredClass = def.required ? ' form-label-required' : '';
  switch (def.type) {
    case 'heading':
      labelCell?.classList.add('form-heading');
      break;
    case 'submit':
      wrapContents(labelCell, 'button', { type: 'submit', class: 'form-submit' });
      if (cells[3]) {
        cells[3].classList.add('form-success');
        cells[3].setAttribute('role', 'status');
        cells[3].setAttribute('tabindex', '-1');
      }
      break;
    case 'checkbox': {
      const input = el('input', {
        type: 'checkbox', id, name, value: 'sim', required: def.required,
      });
      wrapContents(labelCell, 'label', { class: 'form-choice', for: id }).prepend(input);
      break;
    }
    case 'radio':
      wrapContents(labelCell, 'span', { id: `${id}-label`, class: `form-label${requiredClass}` });
      row.setAttribute('role', 'radiogroup');
      row.setAttribute('aria-labelledby', `${id}-label`);
      decorateChoices(cells[4], 'radio', name, id, def.required);
      break;
    case 'multiselect':
      decorateMultiselect(row, cells, def, id);
      break;
    default: {
      const common = { id, name, required: def.required };
      let control;
      if (def.type === 'textarea') {
        control = el('textarea', { ...common, placeholder: def.placeholder, rows: 4 });
      } else if (def.type === 'select') {
        control = el('select', common);
        // options are named by their label attribute, so no words are added to the page text
        control.append(el('option', {
          value: '', disabled: true, selected: true, label: def.placeholder || DEFAULT_PLACEHOLDER,
        }));
        optionTexts(cells[4]).forEach((o) => control.append(el('option', { value: o, label: o })));
      } else {
        control = el('input', { ...common, type: ['email', 'tel', 'number', 'date'].includes(def.type) ? def.type : 'text', placeholder: def.placeholder });
      }
      wrapContents(labelCell, 'label', { for: id, id: `${id}-label`, class: `form-label${requiredClass}` });
      // the control lives in the label cell so the authored cell order (UE selectors) is unchanged
      labelCell?.append(control);
    }
  }
}

export default function decorate(block) {
  formId += 1;
  const form = el('form', { class: 'form-form', novalidate: true });

  [...block.children].forEach((row, i) => {
    const cells = [...row.children];
    const def = {
      type: (cellText(cells[0]) || 'text').toLowerCase(),
      name: cellText(cells[2]),
      placeholder: cellText(cells[3]),
      required: /^(sim|true|x|yes|obrigat[oó]rio)$/i.test(cellText(cells[5])),
    };
    row.classList.add('form-field', `form-field-${def.type}`);
    cells.forEach((cell, n) => cell.classList.add(`form-cell-${CELLS[n] || 'extra'}`));
    decorateField(row, cells, def, `form-${formId}-${def.name || i}`);
    form.append(row);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('form-validated');
      form.reportValidity();
      return;
    }
    // demo only: nothing is sent — show the authored confirmation message
    const success = form.querySelector('.form-success');
    if (success && !success.textContent.trim()) success.textContent = 'Dados enviados com sucesso!';
    form.classList.add('form-sent');
    success?.focus();
  });

  block.replaceChildren(form);

  // WebMCP (declarative): describe the form and each field for in-browser AI agents
  // (after the form is in the document, so labels and group names resolve)
  const formTitle = block.closest('.section')?.querySelector('h2')?.textContent.trim();
  form.setAttribute('toolname', block.dataset.toolname || 'receber-novidades-sebrae');
  form.setAttribute('tooldescription', `${formTitle || 'Formulário do Sebrae'} — preenche os dados de contato e as preferências de conteúdo do visitante.`);
  form.querySelectorAll('input, select, textarea').forEach((control) => {
    const own = control.labels?.[0]?.textContent.trim();
    const group = document.getElementById(control.closest('[aria-labelledby]')?.getAttribute('aria-labelledby'))?.textContent.trim();
    const hint = control.getAttribute('placeholder');
    const description = control.type === 'checkbox' && group ? `${group}: ${own}` : own || group;
    if (description) control.setAttribute('toolparamdescription', hint ? `${description} (${hint})` : description);
  });
}
