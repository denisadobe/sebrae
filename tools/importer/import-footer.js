/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the global footer (footer fragment) of sebrae.com.br.
 * Run against https://sebrae.com.br/ — reads the live footer and emits /footer
 * as flat, DA-friendly sections (no classes, no form controls):
 *   1. link columns  — per column: bold title paragraph + ul of links
 *   2. app download  — title paragraph
 *   3. bottom bar    — "Siga o Sebrae:" + ul of social links, copyright, contact line
 */

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
const abs = (href, base) => { try { return new URL(href, base).href; } catch (e) { return href; } };

const SOCIAL_NAMES = {
  facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', twitter: 'X (Twitter)', youtube: 'YouTube',
};

export default {
  transform: ({ document, url, params }) => {
    const base = params.originalURL || url;
    const footer = document.querySelector('footer');
    const sections = [];
    const add = (...nodes) => { sections.push(nodes.filter(Boolean)); };
    const el = (tag, txt) => { const e = document.createElement(tag); if (txt) e.textContent = txt; return e; };
    const link = (href, label) => { const a = el('a', label); a.href = abs(href, base); return a; };

    // 1. link columns
    const columns = [];
    footer.querySelectorAll('.header-list-title').forEach((title) => {
      const list = title.parentElement.querySelector('ul.cmp-list');
      const ul = el('ul');
      if (list) {
        list.querySelectorAll('a.cmp-list__item-link').forEach((a) => {
          const li = el('li');
          li.append(link(a.getAttribute('href'), text(a.querySelector('.cmp-list__item-title') || a)));
          ul.append(li);
        });
      }
      const heading = el('p');
      heading.append(el('strong', text(title)));
      columns.push(heading, ul);
    });
    add(...columns);

    // 2. app download block (title only: the store badges never render on the source page)
    const appTitle = footer.querySelector('p.button-list__title');
    if (appTitle) add(el('p', text(appTitle)));

    // 3. bottom bar
    const bottom = [];
    const follow = [...footer.querySelectorAll('p')].find((p) => /Siga o Sebrae/i.test(p.textContent));
    if (follow) {
      bottom.push(el('p', text(follow)));
      const ul = el('ul');
      follow.parentElement.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href');
        const key = Object.keys(SOCIAL_NAMES).find((k) => href.includes(k));
        const li = el('li');
        li.append(link(href, key ? SOCIAL_NAMES[key] : href));
        ul.append(li);
      });
      bottom.push(ul);
    }
    const copyright = [...footer.querySelectorAll('p')].find((p) => p.textContent.includes('©'));
    if (copyright) bottom.push(el('p', text(copyright)));
    const contact = [...footer.querySelectorAll('p')].find((p) => /Central de Relacionamento/i.test(p.textContent));
    if (contact) {
      const p = el('p');
      const phone = contact.querySelector('u, strong, a');
      const label = text(contact).replace(text(phone), '').trim();
      p.append(document.createTextNode(`${label} `));
      if (phone) p.append(el('strong', text(phone)));
      bottom.push(p);
    }
    add(...bottom);

    document.body.innerHTML = '';
    sections.forEach((nodes, i) => {
      if (i) document.body.append(el('hr'));
      document.body.append(...nodes);
    });

    return [{
      element: document.body,
      path: '/footer',
      report: { title: 'footer', sections: sections.length },
    }];
  },
};
