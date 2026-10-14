import { moveInstrumentation } from '../../scripts/ue-utils.js';

/*
 * Form: native form built from authored rows (demo — submitting only shows a confirmation).
 * Each row = one field: [type | label | name | placeholder | options | required]
 *   type: text, email, tel, textarea, select, multiselect, checkbox, radio, heading, submit
 *   options: comma-separated (or one per list item / paragraph) for select, multiselect, radio
 *   required: sim / true / x
 *   submit row: label = button text, placeholder = confirmation message shown after "sending"
 * Authored rows stay in the DOM (cells hidden) so every field remains editable in Universal Editor.
 */

let formId = 0;

const cellText = (cell) => (cell ? cell.textContent.replace(/\s+/g, ' ').trim() : '');

function cellOptions(cell) {
  if (!cell) return [];
  // one option per list item / paragraph, or a single comma-separated line
  const items = [...cell.querySelectorAll('li, p')];
  const values = items.length > 1 ? items.map((i) => i.textContent) : cell.textContent.split(',');
  return values.map((v) => v.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === true) e.setAttribute(k, '');
    else if (v !== false && v !== undefined && v !== null && v !== '') e.setAttribute(k, v);
  });
  children.filter(Boolean).forEach((c) => e.append(c));
  return e;
}

function labelFor(id, text, required) {
  return el('label', { for: id, class: 'form-label' }, text, required ? el('span', { class: 'form-required', 'aria-hidden': 'true' }, ' *') : null);
}

function buildMultiselect(id, def) {
  const summary = el('summary', { class: 'form-multiselect-summary', id: `${id}-summary` }, def.placeholder || 'Selecione...');
  const list = el('div', { class: 'form-multiselect-options', role: 'group', 'aria-labelledby': `${id}-label` });
  def.options.forEach((opt, i) => {
    const optId = `${id}-${i}`;
    list.append(el(
      'label',
      { class: 'form-multiselect-option', for: optId },
      el('input', {
        type: 'checkbox', id: optId, name: def.name, value: opt,
      }),
      el('span', {}, opt),
    ));
  });
  const details = el('details', { class: 'form-multiselect' }, summary, list);
  list.addEventListener('change', () => {
    const chosen = [...list.querySelectorAll('input:checked')].map((c) => c.value);
    summary.textContent = chosen.length ? chosen.join(', ') : (def.placeholder || 'Selecione...');
    summary.classList.toggle('has-value', chosen.length > 0);
    const first = list.querySelector('input');
    if (first && def.required) first.setCustomValidity(chosen.length ? '' : 'Selecione ao menos uma opção.');
  });
  if (def.required) {
    const first = list.querySelector('input');
    if (first) first.setCustomValidity('Selecione ao menos uma opção.');
  }
  return details;
}

function buildControl(id, def) {
  const common = {
    id, name: def.name || id, required: def.required,
  };
  switch (def.type) {
    case 'textarea':
      return el('textarea', { ...common, placeholder: def.placeholder, rows: 4 });
    case 'select': {
      const select = el('select', common);
      select.append(el('option', { value: '', disabled: true, selected: true }, def.placeholder || 'Selecione...'));
      def.options.forEach((o) => select.append(el('option', { value: o }, o)));
      return select;
    }
    case 'multiselect':
      return buildMultiselect(id, def);
    case 'radio': {
      const group = el('div', { class: 'form-radio-group', role: 'radiogroup' });
      def.options.forEach((o, i) => group.append(el('label', { class: 'form-choice', for: `${id}-${i}` }, el('input', {
        type: 'radio', id: `${id}-${i}`, name: def.name || id, value: o, required: def.required,
      }), el('span', {}, o))));
      return group;
    }
    default:
      return el('input', { ...common, type: ['email', 'tel', 'number', 'date'].includes(def.type) ? def.type : 'text', placeholder: def.placeholder });
  }
}

function buildField(def, id) {
  const wrapper = el('div', { class: `form-field form-field-${def.type}` });
  if (def.type === 'heading') {
    wrapper.append(el('p', { class: 'form-heading' }, def.label));
  } else if (def.type === 'submit') {
    wrapper.append(el('button', { type: 'submit', class: 'form-submit' }, def.label || 'Enviar'));
  } else if (def.type === 'checkbox') {
    wrapper.append(el('label', { class: 'form-choice', for: id }, el('input', {
      type: 'checkbox', id, name: def.name || id, value: 'sim', required: def.required,
    }), el('span', {}, def.label)));
  } else {
    const label = labelFor(id, def.label, def.required);
    label.id = `${id}-label`;
    wrapper.append(label, buildControl(id, def));
  }
  return wrapper;
}

export default function decorate(block) {
  formId += 1;
  const form = el('form', { class: 'form-form', novalidate: true });
  let success = '';

  [...block.children].forEach((row, i) => {
    const cells = [...row.children];
    const def = {
      type: (cellText(cells[0]) || 'text').toLowerCase(),
      label: cellText(cells[1]),
      name: cellText(cells[2]),
      placeholder: cellText(cells[3]),
      options: cellOptions(cells[4]),
      required: /^(sim|true|x|yes|obrigat[oó]rio)$/i.test(cellText(cells[5])),
    };
    if (def.type === 'submit') success = def.placeholder;
    const field = buildField(def, `form-${formId}-${def.name || i}`);
    // keep the authored row (hidden) inside the field so the editor item stays selectable
    moveInstrumentation(row, field);
    row.className = 'form-field-source';
    row.hidden = true;
    field.append(row);
    form.append(field);
  });

  const status = el('p', { class: 'form-success', role: 'status', hidden: true }, success || 'Dados enviados com sucesso!');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('form-validated');
      form.reportValidity();
      return;
    }
    // demo only: nothing is sent
    form.hidden = true;
    status.hidden = false;
  });

  block.replaceChildren(form, status);
}
