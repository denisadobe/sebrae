/*
 * Adobe Brand Concierge (commerce branch): loads the Web SDK + Web Client on demand and
 * mounts the chat once per page — inside the brand-concierge block (full page) or in a
 * floating popup opened from a launcher button. Nothing is downloaded until it is needed.
 * Per page, the popup can be turned off with the metadata "brand-concierge: off".
 */
import { loadCSS, loadScript } from './aem.js';
import {
  ALLOY_CONFIG, ALLOY_SRC, STYLE_OVERRIDES, STYLE_URL, WEB_CLIENT_SRC,
} from './brand-concierge-config.js';

const MOUNT_ID = 'brand-concierge-mount';
const FULL_PAGE = '/assistente';
let runtime;
let styling;
let mounted = false;

// shallow-by-section merge: overrides replace keys inside each top-level section
const merge = (base, extra) => Object.entries(extra).reduce((acc, [key, value]) => ({
  ...acc,
  [key]: value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(acc[key] || {}), ...value }
    : value,
}), { ...base });

async function loadStyling() {
  if (!styling) {
    styling = fetch(`${window.hlx.codeBasePath}${STYLE_URL}`)
      .then((resp) => (resp.ok ? resp.json() : {}))
      .catch(() => ({}))
      .then((config) => {
        const behavior = merge(config.behavior || {}, STYLE_OVERRIDES.behavior);
        const disclaimer = { ...(config.disclaimer || {}), ...STYLE_OVERRIDES.disclaimer };
        const text = { ...STYLE_OVERRIDES.text, ...(config.text || {}) };
        return {
          ...config, behavior, disclaimer, text,
        };
      });
  }
  return styling;
}

// Web SDK command queue (same as the "alloy" base code of the install script)
function installAlloyStub() {
  if (window.alloy) return;
  // eslint-disable-next-line no-underscore-dangle
  (window.__alloyNS = window.__alloyNS || []).push('alloy');
  const alloy = (...args) => new Promise((resolve, reject) => {
    alloy.q.push([resolve, reject, args]);
  });
  alloy.q = [];
  window.alloy = alloy;
}

function whenReady(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.adobe?.concierge?.bootstrap) resolve();
      else if (Date.now() - start > timeout) reject(new Error('Brand Concierge não carregou'));
      else setTimeout(check, 100);
    };
    check();
  });
}

function loadRuntime() {
  if (!runtime) {
    runtime = (async () => {
      loadCSS(`${window.hlx.codeBasePath}/styles/brand-concierge.css`);
      installAlloyStub();
      await loadScript(ALLOY_SRC);
      await loadScript(WEB_CLIENT_SRC);
      window.alloy('configure', ALLOY_CONFIG);
      window.alloy('sendEvent', {});
      await whenReady();
    })();
  }
  return runtime;
}

/** Mounts the concierge inside the given container (only the first call mounts). */
export async function mountConcierge(container) {
  if (mounted) return false;
  mounted = true;
  const mount = document.createElement('div');
  mount.id = MOUNT_ID;
  container.append(mount);
  try {
    const [stylingConfigurations] = await Promise.all([loadStyling(), loadRuntime()]);
    window.adobe.concierge.bootstrap({
      instanceName: 'alloy',
      stylingConfigurations,
      selector: `#${MOUNT_ID}`,
      stickySession: true,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('brand-concierge:', error);
    mount.textContent = 'O assistente não está disponível no momento. Tente novamente mais tarde.';
    mount.classList.add('brand-concierge-error');
  }
  return true;
}

function icon(name) {
  const span = document.createElement('span');
  span.className = `brand-concierge-icon brand-concierge-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/** Floating launcher + popup panel (chat mounted on first open, kept alive afterwards). */
export function addLauncher() {
  if (document.querySelector('.brand-concierge-launcher')) return;
  loadCSS(`${window.hlx.codeBasePath}/styles/brand-concierge.css`);

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'brand-concierge-launcher';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'brand-concierge-popup');
  const label = document.createElement('span');
  label.textContent = 'Assistente Sebrae';
  launcher.append(icon('sparkle'), label);

  const panel = document.createElement('div');
  panel.className = 'brand-concierge-popup';
  panel.id = 'brand-concierge-popup';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Assistente Sebrae');
  panel.hidden = true;
  const header = document.createElement('div');
  header.className = 'brand-concierge-popup-header';
  const title = document.createElement('p');
  title.className = 'brand-concierge-popup-title';
  title.append(icon('sparkle'), 'Assistente Sebrae');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'brand-concierge-popup-close';
  close.setAttribute('aria-label', 'Fechar assistente');
  close.append(icon('close'));
  // continue the same conversation on the full-page chat (sticky session + transcript)
  const expand = document.createElement('a');
  expand.className = 'brand-concierge-popup-expand';
  expand.href = FULL_PAGE;
  expand.setAttribute('aria-label', 'Abrir em tela cheia');
  expand.title = 'Abrir em tela cheia';
  expand.append(icon('expand'));
  const actions = document.createElement('div');
  actions.className = 'brand-concierge-popup-actions';
  actions.append(expand, close);
  header.append(title, actions);
  const body = document.createElement('div');
  body.className = 'brand-concierge-popup-body';
  panel.append(header, body);
  document.body.append(panel, launcher);

  const toggle = (open) => {
    panel.hidden = !open;
    launcher.hidden = open;
    launcher.setAttribute('aria-expanded', open);
    document.body.classList.toggle('brand-concierge-open', open);
    if (open) {
      mountConcierge(body);
      close.focus();
    } else {
      launcher.focus();
    }
  };
  launcher.addEventListener('click', () => toggle(true));
  close.addEventListener('click', () => toggle(false));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !panel.hidden) toggle(false);
  });
}
