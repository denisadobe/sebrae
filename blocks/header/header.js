import { createOptimizedPicture } from '../../scripts/dm-images.js';

/*
 * Sebrae header. Content comes from the nav fragment (4 flat sections):
 *   1. notification bar  (message + call to action)
 *   2. utility bar       (audience links + accessibility link)
 *   3. brand + tools     (logo link, search placeholder, tool links)
 *   4. main menu         (nested list; a sub-list is a megamenu made of
 *                         columns [li > ul], cards [li with image] and a cta [li > a])
 * This module only reads that content and adds structure, controls and behavior.
 */

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');
const NOTIFICATION_KEY = 'sebrae-notification-dismissed';

function icon(name) {
  const span = document.createElement('span');
  span.className = `nav-icon nav-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function el(tag, className, ...children) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  children.filter(Boolean).forEach((c) => e.append(c));
  return e;
}

/** metadata-independent: /content first (local preview), then site root (DA/EDS) */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = await resp.text();
  return wrapper;
}

/** own text of a list item, ignoring nested lists */
function ownText(li) {
  return [...li.childNodes]
    .filter((n) => !(n.nodeType === Node.ELEMENT_NODE && ['UL', 'OL'].includes(n.tagName)))
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashOf(a) {
  return ((a && a.getAttribute('href')) || '').replace(/^.*#/, '');
}

function buildNotification(section, header) {
  if (!section) return null;
  const message = section.querySelector('p:not(:has(a))');
  const cta = section.querySelector('a');
  const bar = el('div', 'nav-notification');
  const inner = el('div', 'nav-notification-inner');
  if (message) inner.append(el('p', 'nav-notification-message', message.textContent.trim()));
  if (cta) {
    const button = el('a', 'nav-notification-cta', icon('pin'), el('span', '', cta.textContent.trim()));
    button.href = cta.getAttribute('href');
    inner.append(button);
  }
  const close = el('button', 'nav-notification-close', icon('close'));
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar aviso');
  close.addEventListener('click', () => {
    header.classList.add('notification-dismissed');
    try { sessionStorage.setItem(NOTIFICATION_KEY, 'true'); } catch (e) { /* ignore */ }
  });
  bar.append(inner, close);
  try {
    if (sessionStorage.getItem(NOTIFICATION_KEY)) header.classList.add('notification-dismissed');
  } catch (e) { /* ignore */ }
  return bar;
}

function buildUtility(section) {
  if (!section) return null;
  const inner = el('div', 'nav-inner');
  const list = section.querySelector('ul');
  if (list) {
    list.className = 'nav-audiences';
    const first = list.querySelector('a');
    if (first) first.setAttribute('aria-current', 'true');
    inner.append(list);
  }
  const contrast = section.querySelector('p a');
  if (contrast) {
    const button = el('button', 'nav-contrast', icon('contrast'), el('span', '', contrast.textContent.trim()));
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const on = document.documentElement.classList.toggle('high-contrast');
      button.setAttribute('aria-pressed', on);
    });
    inner.append(button);
  }
  return el('div', 'nav-utility', inner);
}

function buildSearch(placeholder) {
  const form = el('form', 'nav-search');
  form.action = 'https://sebrae.com.br/resultado-de-busca';
  form.method = 'get';
  form.setAttribute('role', 'search');
  const label = el('label', 'nav-search-label', placeholder);
  label.htmlFor = 'nav-search-input';
  const input = el('input', 'nav-search-input');
  input.id = 'nav-search-input';
  input.type = 'search';
  input.name = 'term';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  const submit = el('button', 'nav-search-submit', icon('search'));
  submit.type = 'submit';
  submit.setAttribute('aria-label', 'Buscar');
  form.append(label, input, submit);
  return form;
}

const TOOL_ICONS = { novidades: 'sparkle', localizacao: 'pin' };

function buildMain(section, hamburger) {
  const inner = el('div', 'nav-inner');
  inner.append(hamburger);
  if (section) {
    const logoLink = section.querySelector('a:has(img)');
    if (logoLink) {
      logoLink.className = 'nav-brand';
      logoLink.setAttribute('aria-label', 'Página inicial');
      inner.append(logoLink);
    }
    const placeholder = [...section.querySelectorAll(':scope > p')]
      .find((p) => !p.querySelector('a') && p.textContent.trim());
    if (placeholder) inner.append(buildSearch(placeholder.textContent.trim()));
    const tools = section.querySelector('ul');
    if (tools) {
      tools.className = 'nav-tools';
      tools.querySelectorAll('a').forEach((a) => {
        const hash = hashOf(a);
        const isHook = a.getAttribute('href').startsWith('#');
        a.classList.add('nav-tool', isHook ? `nav-tool-${hash}` : 'nav-tool-login');
        if (TOOL_ICONS[hash]) a.prepend(icon(TOOL_ICONS[hash]));
        if (isHook) {
          a.setAttribute('role', 'button');
          a.addEventListener('click', (e) => e.preventDefault());
        }
      });
      inner.append(tools);
    }
  }
  const row = el('div', 'nav-main', inner);

  // mobile-only: search toggle + round account button (reuse the login link)
  const searchToggle = el('button', 'nav-search-toggle', icon('search'));
  searchToggle.type = 'button';
  searchToggle.setAttribute('aria-label', 'Buscar');
  searchToggle.setAttribute('aria-expanded', 'false');
  searchToggle.addEventListener('click', () => {
    const open = row.classList.toggle('nav-search-open');
    searchToggle.setAttribute('aria-expanded', open);
    if (open) row.querySelector('.nav-search-input')?.focus();
  });
  const login = inner.querySelector('.nav-tool-login');
  const mobileActions = el('div', 'nav-mobile-actions', searchToggle);
  if (login) {
    const account = el('a', 'nav-account', icon('user'));
    account.href = login.href;
    account.setAttribute('aria-label', login.textContent.trim());
    mobileActions.append(account);
  }
  inner.append(mobileActions);
  return row;
}

/** mobile drawer extras, built from the utility + tools content (hidden on desktop) */
function buildDrawerExtras(utility, main, menu) {
  const audiences = utility && [...utility.querySelectorAll('.nav-audiences a')];
  if (audiences && audiences.length) {
    const current = audiences.find((a) => a.getAttribute('aria-current')) || audiences[0];
    const top = el('p', 'nav-drawer-audience', current.textContent.trim());
    menu.prepend(top);
  }
  const footer = el('div', 'nav-drawer-footer');
  if (audiences && audiences.length > 1) {
    const list = el('ul', 'nav-drawer-audiences');
    audiences.filter((a) => !a.getAttribute('aria-current')).forEach((a) => {
      const copy = a.cloneNode(true);
      list.append(el('li', '', copy));
    });
    footer.append(list);
  }
  const tools = el('ul', 'nav-drawer-tools');
  const contrast = utility && utility.querySelector('.nav-contrast');
  if (contrast) {
    const copy = contrast.cloneNode(true);
    copy.addEventListener('click', () => contrast.click());
    tools.append(el('li', '', copy));
  }
  main.querySelectorAll('.nav-tool:not(.nav-tool-login)').forEach((a) => {
    const copy = a.cloneNode(true);
    copy.addEventListener('click', (e) => e.preventDefault());
    tools.append(el('li', '', copy));
  });
  if (tools.children.length) footer.append(tools);
  const login = main.querySelector('.nav-tool-login');
  if (login) {
    const copy = login.cloneNode(true);
    copy.className = 'nav-drawer-login';
    footer.append(copy);
  }
  menu.append(footer);
}

function buildCard(li) {
  const img = li.querySelector('img');
  const title = li.querySelector('strong');
  const cta = li.querySelector('a');
  const card = el('a', 'nav-card');
  card.href = cta ? cta.getAttribute('href') : '#';
  if (img) {
    const picture = createOptimizedPicture(img.getAttribute('src'), img.alt, false, [{ width: '200' }]);
    card.append(el('span', 'nav-card-image', picture));
  }
  const body = el('span', 'nav-card-body');
  if (title) body.append(el('span', 'nav-card-title', title.textContent.trim()));
  if (cta) body.append(el('span', 'nav-card-link', cta.textContent.trim(), icon('arrow-right')));
  card.append(body);
  return card;
}

function buildPanel(list, id) {
  const panel = el('div', 'nav-panel');
  panel.id = id;
  const inner = el('div', 'nav-panel-inner');
  const main = el('div', 'nav-panel-main');
  const columns = el('div', 'nav-panel-columns');
  const cards = el('div', 'nav-panel-cards');
  [...list.children].forEach((li) => {
    const sub = li.querySelector(':scope > ul');
    if (sub) {
      const column = el('div', 'nav-panel-column');
      const heading = ownText(li);
      if (heading) column.append(el('p', 'nav-panel-heading', heading));
      sub.className = 'nav-panel-links';
      sub.querySelectorAll(':scope > li').forEach((item) => {
        const desc = [...item.querySelectorAll('p')].find((p) => !p.querySelector('a'));
        if (desc) {
          item.classList.add('nav-panel-link-desc');
          const a = item.querySelector('a');
          if (a) a.append(el('span', 'nav-panel-link-text', desc.textContent.trim()));
          desc.remove();
        }
      });
      column.append(sub);
      columns.append(column);
    } else if (li.querySelector('img')) {
      cards.append(buildCard(li));
    } else if (li.querySelector('a')) {
      const a = li.querySelector('a');
      a.className = 'nav-panel-cta-link';
      a.append(icon('arrow-right'));
      main.append(el('div', 'nav-panel-cta', a));
    }
  });
  main.prepend(columns);
  inner.append(main);
  if (cards.children.length) {
    inner.append(cards);
    panel.classList.add('nav-panel-has-cards');
  }
  panel.append(inner);
  return panel;
}

function closeAll(menu, except) {
  menu.querySelectorAll('.nav-drop-trigger[aria-expanded="true"]').forEach((b) => {
    if (b !== except) b.setAttribute('aria-expanded', 'false');
  });
}

function buildMenu(section) {
  const list = section && section.querySelector('ul');
  const menu = el('div', 'nav-sections');
  if (!list) return menu;
  list.className = 'nav-menu';
  let i = 0;
  [...list.children].forEach((li) => {
    li.className = 'nav-item';
    const sub = li.querySelector(':scope > ul');
    const link = li.querySelector(':scope > p > a, :scope > a');
    if (link) {
      link.className = 'nav-link';
      li.replaceChildren(link);
      return;
    }
    if (!sub) return;
    i += 1;
    const label = ownText(li);
    const panelId = `nav-panel-${i}`;
    const trigger = el('button', 'nav-link nav-drop-trigger', el('span', '', label), icon('chevron-down'));
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panelId);
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      closeAll(menu, trigger);
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    li.classList.add('nav-drop');
    const panel = buildPanel(sub, panelId);
    // mobile-only back button (slide-in sub panel)
    const back = el('button', 'nav-panel-back', icon('chevron-down'), el('span', '', label));
    back.type = 'button';
    back.addEventListener('click', () => {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    });
    panel.prepend(back);
    li.replaceChildren(trigger, panel);
  });
  menu.append(list);
  return menu;
}

function toggleMenu(header, force) {
  const nav = header.querySelector('nav');
  const expanded = force !== undefined ? !force : nav.getAttribute('aria-expanded') === 'true';
  const open = !expanded && !isDesktop.matches;
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  const button = header.querySelector('.nav-hamburger');
  button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.style.overflowY = open ? 'hidden' : '';
}

/**
 * commerce branch: a nav login link to the store login page (/loja/entrar) follows the
 * customer session — "Minha conta" when signed in, back to the current page after sign in
 */
const STORE_LOGIN = '/loja/entrar';
const STORE_ACCOUNT = '/loja/conta';
function decorateAccountLinks(nav) {
  const signedIn = document.cookie.split('; ').some((c) => c.startsWith('auth_dropin_user_token='));
  const here = window.location.pathname + window.location.search;
  nav.querySelectorAll('.nav-tool-login, .nav-drawer-login, .nav-account').forEach((a) => {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== STORE_LOGIN) return;
    if (signedIn) {
      a.href = STORE_ACCOUNT;
      if (a.classList.contains('nav-account')) a.setAttribute('aria-label', 'Minha conta');
      else a.textContent = 'Minha conta';
    } else if (window.location.pathname !== STORE_LOGIN) {
      a.href = `${STORE_LOGIN}?redirect=${encodeURIComponent(here)}`;
    }
  });
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  if (!fragment) return;
  const sections = [...fragment.querySelectorAll(':scope > div')];
  const header = block.closest('header') || block;

  const hamburger = el('button', 'nav-hamburger', el('span', 'nav-hamburger-icon'));
  hamburger.type = 'button';
  hamburger.setAttribute('aria-controls', 'nav');

  const nav = el('nav', '');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Menu principal');
  const menu = buildMenu(sections[3]);
  const utility = buildUtility(sections[1]);
  const main = buildMain(sections[2], hamburger);
  buildDrawerExtras(utility, main, menu);
  nav.append(...[utility, main, menu].filter(Boolean));
  decorateAccountLinks(nav);

  const wrapper = el('div', 'nav-wrapper');
  const notification = buildNotification(sections[0], header);
  if (notification) wrapper.append(notification);
  wrapper.append(nav);
  block.replaceChildren(wrapper);

  // commerce branch: header mini-cart (cart drop-in)
  import('../../scripts/mini-cart.js')
    .then(({ default: addMiniCart }) => addMiniCart(main))
    // eslint-disable-next-line no-console
    .catch((e) => console.error('mini-cart:', e));

  hamburger.addEventListener('click', () => toggleMenu(header));
  toggleMenu(header, false);

  // close megamenus on outside click / Escape
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAll(menu);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    const open = menu.querySelector('.nav-drop-trigger[aria-expanded="true"]');
    if (open) {
      closeAll(menu);
      open.focus();
    } else if (nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(header, false);
      hamburger.focus();
    }
  });

  // reset state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => {
    closeAll(menu);
    toggleMenu(header, false);
  });
}
