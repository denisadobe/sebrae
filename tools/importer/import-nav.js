/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the global navigation (nav fragment) of sebrae.com.br.
 * Run against https://sebrae.com.br/ — reads the live header (#ps-header) and
 * emits /nav as flat, DA-friendly sections (no classes, no form controls):
 *   1. notification bar  — message paragraph + "Ativar localização" link
 *   2. utility bar       — audience links list + "Alto contraste" link
 *   3. brand + tools     — logo link, search placeholder paragraph, tool links
 *   4. main menu         — nested list; megamenu = li > ul of
 *                          columns (li: optional heading text + ul of links),
 *                          cards (li: image + strong title + link),
 *                          cta (li: single link)
 * Megamenu card images lazy-load on open, so missing ones are resolved from the
 * page's server-rendered data (title -> next Scene7 URL).
 */

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
const abs = (href, base) => { try { return new URL(href, base).href; } catch (e) { return href; } };

function rawPageData(url) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    return xhr.status === 200 ? xhr.responseText : '';
  } catch (e) {
    return '';
  }
}

function imageForTitle(raw, title) {
  if (!raw || !title) return null;
  const i = raw.indexOf(`"title":"${title}"`);
  if (i < 0) return null;
  const m = raw.slice(i, i + 4000).match(/https:(?:\\u002F|\/){2}sebrae\.scene7\.com[^"\\]*(?:\\u002F[^"\\]*)*/);
  return m ? m[0].replace(/\\u002F/g, '/').replace(/ /g, '%20') : null;
}

function link(document, href, label, base) {
  const a = document.createElement('a');
  // in-page hooks (#localizacao, #alto-contraste…) and the home link stay relative
  a.setAttribute('href', /^[#/](?!\/)/.test(href) && (href.startsWith('#') || href === '/') ? href : abs(href, base));
  a.textContent = label;
  return a;
}

function p(document, ...children) {
  const el = document.createElement('p');
  children.forEach((c) => el.append(c));
  return el;
}

function buildMegamenu(document, container, raw, base) {
  const ul = document.createElement('ul');
  // link columns: each .ps-profile-menu__title is followed by its .ps-profile-menu__list
  const lists = [...container.querySelectorAll('.ps-profile-menu__list')];
  lists.forEach((list) => {
    const li = document.createElement('li');
    const prev = list.previousElementSibling;
    const heading = prev && prev.classList.contains('ps-profile-menu__title') ? text(prev) : '';
    if (heading) li.append(document.createTextNode(heading));
    const sub = document.createElement('ul');
    list.querySelectorAll('a.ps-profile-menu__link').forEach((a) => {
      const item = document.createElement('li');
      // "Cursos e Eventos" links carry a description paragraph inside the anchor
      const desc = a.querySelector('p');
      const clone = a.cloneNode(true);
      clone.querySelectorAll('p').forEach((x) => x.remove());
      item.append(link(document, a.getAttribute('href'), text(clone), base));
      if (desc) item.append(p(document, text(desc)));
      sub.append(item);
    });
    li.append(sub);
    ul.append(li);
  });
  // bottom CTA ("Explorar ...")
  container.querySelectorAll('.ps-profile-menu__cta a[href]').forEach((a) => {
    const li = document.createElement('li');
    li.append(link(document, a.getAttribute('href'), text(a), base));
    ul.append(li);
  });
  // promo cards
  container.querySelectorAll('a.ps-profile-menu__card').forEach((card) => {
    const title = text(card.querySelector('.ps-profile-menu__card-title'));
    const cta = text(card.querySelector('.ps-profile-menu__card-link'));
    const imgEl = card.querySelector('img');
    const src = (imgEl && imgEl.getAttribute('src')) || imageForTitle(raw, title);
    const li = document.createElement('li');
    if (src) {
      const img = document.createElement('img');
      img.src = abs(src, base);
      img.alt = (imgEl && imgEl.alt) || title;
      li.append(p(document, img));
    }
    const strong = document.createElement('strong');
    strong.textContent = title;
    li.append(p(document, strong));
    li.append(p(document, link(document, card.getAttribute('href'), cta, base)));
    ul.append(li);
  });
  return ul;
}

export default {
  transform: ({ document, url, params }) => {
    const base = params.originalURL || url;
    const raw = rawPageData(base);
    const header = document.querySelector('#ps-header') || document.body;
    const main = document.createElement('div');
    const section = () => { const s = document.createElement('div'); main.append(s); return s; };

    // 1. notification bar
    const banner = header.querySelector('.ps-notification-banner');
    if (banner) {
      const s = section();
      const msg = [...banner.querySelectorAll('div')].find((d) => !d.children.length && text(d));
      if (msg) s.append(p(document, text(msg)));
      const cta = banner.querySelector('.bt-notification');
      if (cta) s.append(p(document, link(document, '#ativar-localizacao', text(cta), base)));
    }

    // 2. utility bar
    const utility = header.querySelector('.ps-gn-utility');
    if (utility) {
      const s = section();
      const ul = document.createElement('ul');
      utility.querySelectorAll('.ps-header-top-bar-links a').forEach((a) => {
        const li = document.createElement('li');
        li.append(link(document, a.getAttribute('href'), text(a), base));
        ul.append(li);
      });
      s.append(ul);
      const contrast = utility.querySelector('.ps-button-high-contrast');
      if (contrast) s.append(p(document, link(document, '#alto-contraste', text(contrast), base)));
    }

    // 3. brand, search, tools
    const topbar = header.querySelector('.ps-gn-topbar');
    if (topbar) {
      const s = section();
      const logo = topbar.querySelector('img');
      if (logo) {
        const a = link(document, '/', '', base);
        a.href = '/';
        const img = document.createElement('img');
        img.src = abs(logo.getAttribute('src'), base);
        img.alt = logo.alt || 'SEBRAE';
        a.append(img);
        s.append(p(document, a));
      }
      const input = topbar.querySelector('input');
      if (input) s.append(p(document, input.getAttribute('placeholder') || 'Buscar'));
      const tools = document.createElement('ul');
      const tool = (label, href) => {
        const li = document.createElement('li');
        li.append(link(document, href, label, base));
        tools.append(li);
      };
      topbar.querySelectorAll('button').forEach((b) => {
        const label = text(b);
        if (label === 'Mostrar novidades') tool(label, '#novidades');
        if (label === 'Localização') tool(label, '#localizacao');
        if (label === 'Entrar') tool(label, 'https://amei.sebrae.com.br/');
      });
      s.append(tools);
    }

    // 4. main menu
    const menu = header.querySelector('.ps-header-inferior-menu-container-desktop');
    if (menu) {
      const s = section();
      const ul = document.createElement('ul');
      menu.querySelectorAll('.ps-header-inferior-menu-links__container-li').forEach((item) => {
        const li = document.createElement('li');
        const trigger = item.querySelector('.ps-header-inferior-menu-links');
        if (trigger.tagName === 'A') {
          li.append(link(document, trigger.getAttribute('href'), text(trigger), base));
        } else {
          li.append(document.createTextNode(text(trigger)));
          const panel = item.querySelector('.regular') || item;
          li.append(buildMegamenu(document, panel, raw, base));
        }
        ul.append(li);
      });
      s.append(ul);
    }

    // sections → <hr> separated document for the importer
    const body = document.createElement('div');
    [...main.children].forEach((s, i) => {
      if (i) body.append(document.createElement('hr'));
      body.append(...s.childNodes);
    });
    document.body.innerHTML = '';
    document.body.append(...body.childNodes);

    return [{
      element: document.body,
      path: '/nav',
      report: { title: 'nav', sections: main.children.length },
    }];
  },
};
