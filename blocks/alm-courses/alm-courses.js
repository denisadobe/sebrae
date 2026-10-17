/*
 * Meus cursos: Adobe Learning Manager courses of the signed-in customer, played inside the
 * site (ALM Fluidic Player in a dialog) when the "my-courses" action returns a learner token.
 * Without one, and with single sign-on configured, the first click connects to ALM silently
 * (identity provider -> ALM -> OAuth code -> "alm-connect" action) and the course opens after
 * the round trip; otherwise it opens in the ALM learner app (new tab).
 * Config (/config.json): alm-my-courses-url, alm-connect-url, alm-client-id, alm-sso-idp-url.
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

function renderCourse(course, ctx) {
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
  if (ctx.player) {
    // embedded ALM player (learner token)
    action = el('button', 'button primary alm-courses-card-action', label);
    action.type = 'button';
    action.addEventListener('click', () => openPlayer(course, ctx.player));
  } else if (ctx.connect) {
    // single sign-on: connect to ALM (silent redirects), then the player opens in the site
    action = el('button', 'button primary alm-courses-card-action', label);
    action.type = 'button';
    action.addEventListener('click', () => {
      action.disabled = true;
      ctx.connect(course);
    });
  } else {
    // no learner token: the course page in the ALM learner app (learner signs in there)
    action = el('a', 'button primary alm-courses-card-action', label);
    action.href = course.url;
    action.target = '_blank';
    action.rel = 'noopener';
  }
  const external = !ctx.player && !ctx.connect;
  action.setAttribute('aria-label', `${label}: ${course.name}${external ? ' (abre o Learning Manager em nova aba)' : ''}`);
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

const SESSION_KEY = 'alm-session';
const CONNECT_KEY = 'alm-connect';

async function getConfig() {
  const { getConfigValue } = await import('@dropins/tools/lib/aem/configs.js');
  await initializeCommerce();
  return {
    coursesUrl: getConfigValue('alm-my-courses-url'),
    connectUrl: getConfigValue('alm-connect-url'),
    clientId: getConfigValue('alm-client-id'),
    idpUrl: getConfigValue('alm-sso-idp-url'),
    almBase: (getConfigValue('alm-base-url') || 'https://learningmanager.adobe.com').replace(/\/$/, ''),
  };
}

/**
 * Silent ALM connection: identity provider (SAML, already signed in) -> ALM -> OAuth authorize
 * -> back to this page with ?code=. Remembers the course to open after the round trip.
 */
function connect(config, course) {
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(CONNECT_KEY, JSON.stringify({ state, loId: course?.loId }));
  const authorize = new URL(`${config.almBase}/oauth/o/authorize`);
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${window.location.origin}${window.location.pathname}`,
    state,
    scope: 'learner:read,learner:write',
    response_type: 'CODE',
  });
  let target = authorize;
  if (config.idpUrl) {
    target = new URL(config.idpUrl);
    target.searchParams.set('RelayState', authorize.href);
  }
  window.location.assign(target.href);
}

/** Back from ALM (?code=&state=): exchange the code for the learner connection. */
async function completeConnect(config) {
  const query = new URLSearchParams(window.location.search);
  const saved = JSON.parse(sessionStorage.getItem(CONNECT_KEY) || 'null');
  if (!query.get('code') || !saved || saved.state !== query.get('state')) return null;
  sessionStorage.removeItem(CONNECT_KEY);
  // clean the URL (code, state, PRIME_BASE) right away
  window.history.replaceState({}, '', window.location.pathname);
  const resp = await fetch(config.connectUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getUserToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: query.get('code') }),
  });
  const result = await resp.json().catch(() => ({}));
  if (resp.status === 403) throw new Error('a conta do Learning Manager é de outro e-mail');
  if (!resp.ok || !result.session) throw new Error(result.error || `alm-connect ${resp.status}`);
  localStorage.setItem(SESSION_KEY, result.session);
  return saved.loId || null;
}

async function load(list, config, { open } = {}) {
  if (!config.coursesUrl) {
    message(list, 'Seus cursos aparecerão aqui em breve.');
    return;
  }
  const resp = await fetch(config.coursesUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getUserToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ almSession: localStorage.getItem(SESSION_KEY) || undefined }),
  });
  if (resp.status === 401) {
    window.location.replace(getLoginLink());
    return;
  }
  if (!resp.ok) throw new Error(`my-courses ${resp.status}`);
  const {
    courses = [], player, session, connect: canConnect,
  } = await resp.json();
  if (session) localStorage.setItem(SESSION_KEY, session);
  if (!courses.length) {
    message(list, 'Você ainda não tem cursos. Acabou de se inscrever? A matrícula leva alguns instantes.', {
      text: 'Ver cursos', href: CATALOG_PAGE,
    });
    return;
  }
  const ctx = {
    player,
    connect: !player && canConnect && config.clientId && config.connectUrl
      ? (course) => connect(config, course) : null,
  };
  const ul = el('ul', 'alm-courses-list');
  ul.append(...courses.map((course) => renderCourse(course, ctx)));
  list.replaceChildren(ul);
  // back from the ALM connection: open the course that was clicked
  const course = open && player && courses.find((c) => c.loId === open);
  if (course) openPlayer(course, player);
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

  const fail = (error) => {
    // eslint-disable-next-line no-console
    console.error('alm-courses:', error);
    message(list, 'Não foi possível carregar os seus cursos no momento.');
  };
  try {
    const almConfig = await getConfig();
    let open = null;
    if (almConfig.connectUrl && new URLSearchParams(window.location.search).has('code')) {
      message(list, 'Conectando ao Learning Manager…');
      open = await completeConnect(almConfig).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('alm-courses connect:', error);
        return null;
      });
    } else {
      message(list, 'Carregando os seus cursos…');
    }
    window.addEventListener('alm-courses:refresh', () => load(list, almConfig).catch(fail));
    await load(list, almConfig, { open });
  } catch (error) {
    fail(error);
  }
}
