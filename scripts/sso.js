/*
 * Single sign-on with the identity provider (Auth0 / OIDC, Authorization Code + PKCE in the
 * browser). After the provider login, the ID token is exchanged by the Runtime action
 * "sso-login" for a Commerce customer token, stored in the same cookies as the auth drop-in,
 * so cart, checkout and account keep working as with the Commerce login form.
 * Config (/config.json): sso-domain, sso-client-id, sso-login-url. Sign out: signOut() in
 * commerce.js also ends the provider session (localStorage "sso-session").
 */
import { initializeCommerce } from './commerce.js';

const PKCE_KEY = 'sso-pkce';
const SESSION_KEY = 'sso-session';
const CALLBACK_PATH = '/loja/entrar';

async function getSsoConfig() {
  await initializeCommerce();
  const { getConfigValue } = await import('@dropins/tools/lib/aem/configs.js');
  const domain = getConfigValue('sso-domain');
  const clientId = getConfigValue('sso-client-id');
  const loginUrl = getConfigValue('sso-login-url');
  return domain && clientId && loginUrl ? { domain, clientId, loginUrl } : null;
}

/** SSO configuration, or null when the site uses the Commerce login form. */
export const isSsoEnabled = async () => !!(await getSsoConfig());

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = (size = 32) => b64url(crypto.getRandomValues(new Uint8Array(size)));
const redirectUri = () => `${window.location.origin}${CALLBACK_PATH}`;

/** Goes to the provider login (or sign-up) page; comes back to /loja/entrar, then to `next`. */
export async function startLogin({ next = '/loja/conta', signup = false } = {}) {
  const config = await getSsoConfig();
  const verifier = random(48);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = random(16);
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, next }));
  const url = new URL(`https://${config.domain}/authorize`);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    ui_locales: 'pt-BR',
    ...(signup && { screen_hint: 'signup' }),
  });
  window.location.assign(url.href);
}

/** True when the current URL is the provider's redirect back (?code=&state=). */
export const isCallback = () => {
  const query = new URLSearchParams(window.location.search);
  return query.has('state') && (query.has('code') || query.has('error'));
};

function setCookie(name, value, maxAge) {
  const secure = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? '' : ' Secure;';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; Max-Age=${maxAge}; SameSite=Lax;${secure}`;
}

/** Seconds until the customer token (JWT) expires; 1 hour when unknown. */
function tokenLifetime(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Math.max(60, Math.floor(exp - Date.now() / 1000));
  } catch (e) {
    return 3600;
  }
}

/**
 * Completes the login on /loja/entrar: code -> ID token (PKCE) -> Commerce customer token.
 * @returns {Promise<string>} the page to go to next
 */
export async function completeLogin() {
  const query = new URLSearchParams(window.location.search);
  const saved = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null');
  sessionStorage.removeItem(PKCE_KEY);
  if (query.get('error')) throw new Error(query.get('error_description') || query.get('error'));
  if (!saved || saved.state !== query.get('state')) throw new Error('login expirado, tente novamente');

  const config = await getSsoConfig();
  const tokenResp = await fetch(`https://${config.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code: query.get('code'),
      code_verifier: saved.verifier,
      redirect_uri: redirectUri(),
    }),
  });
  const { id_token: idToken, error_description: tokenError } = await tokenResp.json();
  if (!tokenResp.ok || !idToken) throw new Error(tokenError || 'falha no login');

  const loginResp = await fetch(config.loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const result = await loginResp.json().catch(() => ({}));
  if (loginResp.status === 403) throw new Error('confirme o seu e-mail pelo link que enviamos e entre de novo');
  if (loginResp.status === 409) {
    throw new Error('já existe uma conta da loja com este e-mail, criada antes do login único. Use outro e-mail');
  }
  if (!loginResp.ok || !result.token) throw new Error(result.error || 'falha ao abrir a sua conta na loja');

  // same cookies as the auth drop-in (storefront-auth)
  const maxAge = tokenLifetime(result.token);
  setCookie('auth_dropin_user_token', result.token, maxAge);
  setCookie('auth_dropin_firstname', result.customer?.firstname || '', maxAge);
  setCookie('auth_dropin_lastname', result.customer?.lastname || '', maxAge);
  localStorage.setItem(SESSION_KEY, config.domain);
  return saved.next || '/loja/conta';
}
