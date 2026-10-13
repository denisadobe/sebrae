/*
 * Sebrae footer. Content comes from the footer fragment (3 flat sections):
 *   1. link columns  (bold title paragraph + list of links, repeated)
 *   2. app download  (title paragraph + paragraph with store badge links)
 *   3. bottom bar    (follow label + social links list, copyright, contact line)
 * This module only reads that content and adds structure and behavior.
 */

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');
const SOCIAL_NETWORKS = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube'];

function el(tag, className, ...children) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  children.filter(Boolean).forEach((c) => e.append(c));
  return e;
}

function icon(name) {
  const span = el('span', `footer-icon footer-icon-${name}`);
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/** metadata-independent: /content first (local preview), then site root (DA/EDS) */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = await resp.text();
  return wrapper;
}

function isExternal(a) {
  try {
    // portal pages (sebrae.com.br or this site) stay in the tab; other hosts are external
    const { hostname } = new URL(a.href, window.location.href);
    return hostname !== 'sebrae.com.br' && hostname !== window.location.hostname;
  } catch (e) {
    return false;
  }
}

function setColumnState(column, open) {
  const toggle = column.querySelector('.footer-column-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function buildColumns(section) {
  const columns = el('div', 'footer-columns');
  if (!section) return columns;
  let i = 0;
  [...section.children].forEach((node) => {
    if (node.tagName !== 'UL') return;
    const title = node.previousElementSibling;
    i += 1;
    const column = el('div', 'footer-column');
    const listId = `footer-list-${i}`;
    node.className = 'footer-links';
    node.id = listId;
    node.querySelectorAll('a').forEach((a) => {
      a.classList.add('footer-link');
      if (isExternal(a)) {
        a.classList.add('footer-link-external');
        a.target = '_blank';
        a.rel = 'noopener';
        a.append(icon('external-link'));
      }
    });
    if (title && title.tagName === 'P') {
      const toggle = el('button', 'footer-column-toggle', el('span', '', title.textContent.trim()), icon('chevron-expand'));
      toggle.type = 'button';
      toggle.setAttribute('aria-controls', listId);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', () => {
        if (isDesktop.matches) return;
        setColumnState(column, toggle.getAttribute('aria-expanded') !== 'true');
      });
      column.append(el('div', 'footer-column-title', toggle));
    }
    column.append(node);
    columns.append(column);
  });
  return columns;
}

function buildApp(section) {
  if (!section) return null;
  const app = el('div', 'footer-app');
  const [title, badges] = section.querySelectorAll(':scope > p');
  if (title) {
    title.className = 'footer-app-title';
    app.append(title);
  }
  if (badges) {
    badges.className = 'footer-app-badges';
    badges.querySelectorAll('a').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener';
      const img = a.querySelector('img');
      if (img) a.setAttribute('aria-label', img.alt);
    });
    app.append(badges);
  }
  return app;
}

function buildBottom(section) {
  const inner = el('div', 'footer-inner');
  if (section) {
    const list = section.querySelector('ul');
    const follow = list && list.previousElementSibling;
    const social = el('div', 'footer-social');
    if (follow && follow.tagName === 'P') {
      follow.className = 'footer-social-label';
      social.append(follow);
    }
    if (list) {
      list.className = 'footer-social-links';
      list.querySelectorAll('a').forEach((a) => {
        const network = SOCIAL_NETWORKS.find((n) => a.href.includes(n));
        a.className = 'footer-social-link';
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', a.textContent.trim());
        a.replaceChildren(icon(`social-${network || 'link'}`));
      });
      social.append(list);
    }
    inner.append(social);
    const paragraphs = [...section.querySelectorAll(':scope > p')];
    const contact = paragraphs.find((p) => p.querySelector('strong'));
    paragraphs.filter((p) => p !== follow && p !== contact).forEach((p) => {
      p.className = 'footer-copyright';
      inner.append(p);
    });
    if (contact) {
      contact.className = 'footer-contact';
      inner.append(contact);
    }
  }
  return el('div', 'footer-bottom', inner);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();
  if (!fragment) return;
  const [linksSection, appSection, bottomSection] = fragment.querySelectorAll(':scope > div');

  const topInner = el('div', 'footer-inner', buildColumns(linksSection), buildApp(appSection));
  const top = el('div', 'footer-top', topInner);
  block.replaceChildren(top, buildBottom(bottomSection));

  // desktop shows every column; mobile starts collapsed
  const sync = () => block.querySelectorAll('.footer-column').forEach((c) => setColumnState(c, isDesktop.matches));
  sync();
  isDesktop.addEventListener('change', sync);
}
