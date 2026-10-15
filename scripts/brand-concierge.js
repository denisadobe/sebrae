/*
 * Adobe Brand Concierge: loads the Web SDK + Web Client on demand and mounts the chat once
 * per page — inside the brand-concierge block (full-page assistant) or in a drawer opened from
 * the floating launcher (same pattern as Experience League): a native <dialog> in the top
 * layer (above the sticky header), sliding in on the right, that expands to a large centred
 * window. Nothing is downloaded until the chat is opened.
 * Per page, the launcher can be turned off with the metadata "brand-concierge: off".
 */
import { loadCSS, loadScript } from './aem.js';
import {
  ALLOY_CONFIG, ALLOY_SRC, STYLE_OVERRIDES, STYLE_URL, WEB_CLIENT_SRC,
} from './brand-concierge-config.js';

const MOUNT_ID = 'brand-concierge-mount';
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
        const theme = { ...(config.theme || {}), ...STYLE_OVERRIDES.theme };
        return {
          ...config, behavior, disclaimer, text, theme,
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

function iconButton(className, label, iconName) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(icon(iconName));
  return button;
}

/** Drawer (right side, full height) that can expand to a large centred window. */
function buildDrawer() {
  const dialog = document.createElement('dialog');
  dialog.id = 'bc-dialog';
  dialog.className = 'bc-drawer';
  dialog.setAttribute('aria-label', 'Assistente Sebrae');

  const header = document.createElement('div');
  header.className = 'bc-drawer-header';
  // header label drawn by CSS (data-label): no text added to the page content
  const title = document.createElement('p');
  title.className = 'bc-drawer-title';
  title.dataset.label = 'Assistente Sebrae';
  title.append(icon('sparkle'));
  const expand = iconButton('bc-drawer-expand', 'Expandir', 'expand');
  expand.setAttribute('aria-pressed', 'false');
  const close = iconButton('bc-drawer-close', 'Fechar assistente', 'close');
  const actions = document.createElement('div');
  actions.className = 'bc-drawer-actions';
  actions.append(expand, close);
  header.append(title, actions);

  const body = document.createElement('div');
  body.className = 'bc-drawer-body';
  dialog.append(header, body);
  document.body.append(dialog);

  const setExpanded = (expanded) => {
    dialog.classList.toggle('is-expanded', expanded);
    expand.setAttribute('aria-pressed', String(expanded));
    expand.setAttribute('aria-label', expanded ? 'Recolher' : 'Expandir');
    expand.title = expand.getAttribute('aria-label');
    expand.replaceChildren(icon(expanded ? 'collapse' : 'expand'));
  };
  expand.addEventListener('click', () => setExpanded(!dialog.classList.contains('is-expanded')));
  close.addEventListener('click', () => dialog.close());
  // click on the backdrop (outside the panel) closes
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  return { dialog, body, setExpanded };
}

/** Floating launcher that opens the assistant drawer. */
export function addLauncher() {
  if (document.querySelector('.brand-concierge-launcher')) return;
  loadCSS(`${window.hlx.codeBasePath}/styles/brand-concierge.css`);
  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'brand-concierge-launcher';
  // the visible label is drawn by CSS (data-label): no text is added to the page content,
  // so AI agents read the same text as the server HTML; the button is named by aria-label
  launcher.setAttribute('aria-label', 'Assistente Sebrae');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-controls', 'bc-dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.dataset.label = 'Assistente Sebrae';
  launcher.append(icon('sparkle'));
  document.body.append(launcher);

  let drawer;
  launcher.addEventListener('click', () => {
    if (!drawer) {
      drawer = buildDrawer();
      drawer.dialog.addEventListener('close', () => {
        launcher.setAttribute('aria-expanded', 'false');
        launcher.hidden = false;
        launcher.focus();
      });
    }
    drawer.dialog.showModal();
    launcher.setAttribute('aria-expanded', 'true');
    launcher.hidden = true;
    mountConcierge(drawer.body);
  });
}
