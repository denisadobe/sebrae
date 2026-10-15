/*
 * Adobe Brand Concierge (commerce branch): loads the Web SDK + Web Client on demand and
 * mounts the chat inside the brand-concierge block (full-page assistant). Other pages get a
 * floating launcher that links to that page; nothing is downloaded until the chat is shown.
 * Per page, the launcher can be turned off with the metadata "brand-concierge: off".
 */
import { loadCSS, loadScript } from './aem.js';
import {
  ALLOY_CONFIG, ALLOY_SRC, STYLE_OVERRIDES, STYLE_URL, WEB_CLIENT_SRC,
} from './brand-concierge-config.js';

const MOUNT_ID = 'brand-concierge-mount';
const FULL_PAGE = '/loja/assistente';
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

/** Floating launcher: a link to the full-page assistant (the chat itself loads there). */
export function addLauncher() {
  if (document.querySelector('.brand-concierge-launcher')) return;
  loadCSS(`${window.hlx.codeBasePath}/styles/brand-concierge.css`);
  const launcher = document.createElement('a');
  launcher.className = 'brand-concierge-launcher';
  launcher.href = FULL_PAGE;
  // the visible label is drawn by CSS (data-label): no text is added to the page content,
  // so AI agents read the same text as the server HTML; the link is named by aria-label
  launcher.setAttribute('aria-label', 'Assistente Sebrae');
  launcher.dataset.label = 'Assistente Sebrae';
  launcher.append(icon('sparkle'));
  document.body.append(launcher);
}
