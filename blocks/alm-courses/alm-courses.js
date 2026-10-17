/*
 * Meus cursos: Adobe Learning Manager courses of the signed-in customer, played inside the
 * site (ALM Fluidic Player in a dialog) when the action returns a learner token, otherwise
 * opened in the ALM learner app (new tab). Data comes from the I/O Runtime "my-courses" action
 * (alm-enrollment/), called with the Commerce customer token; its URL is the
 * "alm-my-courses-url" key of /config.json.
 * Authoring (key-value table, optional):
 *   title | heading of the list (default "Meus cursos")
 */
import { readBlockConfig } from '../../scripts/aem.js';
import {
  CATALOG_PAGE, IS_UE, getLoginLink, getUserToken, initializeCommerce,
} from '../../scripts/commerce.js';

const el = (tag, className, text) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
};

const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  if (!minutes) return '';
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
};

/** Full-screen dialog with the ALM player; closes on the button, Esc or the player's "close". */
function openPlayer(course, player) {
  const url = new URL('/app/player', player.baseUrl);
  url.searchParams.set('lo_id', course.loId);
  url.searchParams.set('access_token', player.accessToken);

  const dialog = el('dialog', 'alm-courses-player');
  dialog.setAttribute('aria-label', course.name);
  const bar = el('div', 'alm-courses-player-bar');
  const close = el('button', 'alm-courses-player-close', 'Fechar curso');
  close.type = 'button';
  bar.append(el('p', 'alm-courses-player-title', course.name), close);
  const frame = el('iframe', 'alm-courses-player-frame');
  frame.title = course.name;
  frame.src = url.href;
  frame.allow = 'fullscreen; autoplay; encrypted-media';
  dialog.append(bar, frame);

  const onMessage = (e) => {
    if (e.origin === new URL(player.baseUrl).origin && e.data === 'status:close') dialog.close();
  };
  dialog.addEventListener('close', () => {
    window.removeEventListener('message', onMessage);
    dialog.remove();
    // progress may have changed: refresh the list
    window.dispatchEvent(new Event('alm-courses:refresh'));
  });
  close.addEventListener('click', () => dialog.close());
  window.addEventListener('message', onMessage);
  document.body.append(dialog);
  dialog.showModal();
}

function renderCourse(course, player) {
  const card = el('li', 'alm-courses-card');
  const media = el('div', 'alm-courses-card-image');
  if (course.imageUrl) {
    const img = el('img');
    img.src = course.imageUrl;
    img.alt = '';
    img.loading = 'lazy';
    media.append(img);
  }
  const body = el('div', 'alm-courses-card-body');
  body.append(el('h3', 'alm-courses-card-title', course.name));
  const duration = formatDuration(course.duration);
  if (duration) body.append(el('p', 'alm-courses-card-meta', `Curso online · ${duration}`));

  const done = course.state === 'COMPLETED' || course.progress >= 100;
  const progress = el('div', 'alm-courses-progress');
  const bar = el('progress');
  bar.max = 100;
  bar.value = Math.min(course.progress, 100);
  bar.setAttribute('aria-label', `Progresso de ${course.name}`);
  progress.append(bar, el('span', '', done ? 'Concluído' : `${Math.round(course.progress)}% concluído`));
  body.append(progress);

  let label = course.progress ? 'Continuar' : 'Começar';
  if (done) label = 'Rever curso';
  let action;
  if (player) {
    // embedded ALM player (learner token)
    action = el('button', 'button primary alm-courses-card-action', label);
    action.type = 'button';
    action.addEventListener('click', () => openPlayer(course, player));
  } else {
    // no learner token: the course page in the ALM learner app (learner signs in there)
    action = el('a', 'button primary alm-courses-card-action', label);
    action.href = course.url;
    action.target = '_blank';
    action.rel = 'noopener';
  }
  action.setAttribute('aria-label', `${label}: ${course.name}${player ? '' : ' (abre o Learning Manager em nova aba)'}`);
  body.append(action);

  card.append(media, body);
  return card;
}

const message = (list, text, link) => {
  const p = el('p', 'alm-courses-message', text);
  if (link) {
    p.append(' ');
    const a = el('a', '', link.text);
    a.href = link.href;
    p.append(a);
  }
  list.replaceChildren(p);
};

async function load(list) {
  const { getConfigValue } = await import('@dropins/tools/lib/aem/configs.js');
  await initializeCommerce();
  const endpoint = getConfigValue('alm-my-courses-url');
  if (!endpoint) {
    message(list, 'Seus cursos aparecerão aqui em breve.');
    return;
  }
  const resp = await fetch(endpoint, { headers: { Authorization: `Bearer ${getUserToken()}` } });
  if (resp.status === 401) {
    window.location.replace(getLoginLink());
    return;
  }
  if (!resp.ok) throw new Error(`my-courses ${resp.status}`);
  const { courses = [], player } = await resp.json();
  if (!courses.length) {
    message(list, 'Você ainda não tem cursos. Acabou de se inscrever? A matrícula leva alguns instantes.', {
      text: 'Ver cursos', href: CATALOG_PAGE,
    });
    return;
  }
  const ul = el('ul', 'alm-courses-list');
  ul.append(...courses.map((course) => renderCourse(course, player)));
  list.replaceChildren(ul);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  // authored rows stay in the DOM (hidden) so the block keeps its Universal Editor instrumentation
  const source = el('div', 'alm-courses-source');
  source.append(...block.children);
  source.hidden = true;

  const heading = el('h2', 'alm-courses-title', config.title || 'Meus cursos');
  const list = el('div', 'alm-courses-content');
  list.setAttribute('aria-live', 'polite');
  block.replaceChildren(heading, list, source);

  if (IS_UE) {
    message(list, 'Cursos do Adobe Learning Manager do cliente conectado.');
    return;
  }
  if (!getUserToken()) {
    message(list, 'Entre na sua conta para ver os seus cursos.', { text: 'Entrar', href: getLoginLink() });
    return;
  }

  const refresh = () => load(list).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('alm-courses:', error);
    message(list, 'Não foi possível carregar os seus cursos no momento.');
  });
  message(list, 'Carregando os seus cursos…');
  window.addEventListener('alm-courses:refresh', refresh);
  await refresh();
}
