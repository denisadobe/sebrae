/*
 * Customer sign in / sign up / password forms (Adobe Commerce auth drop-in).
 * Authoring (key-value table):
 *   form     | sign-in (default), sign-up, forgot-password or update-password
 *   redirect | page after sign in (default /loja/conta; a ?redirect= on the URL wins)
 * update-password is the page of the "reset password" e-mail link (?email=&key=).
 * With single sign-on configured (sso-* keys of /config.json) the identity provider handles
 * the forms: the block shows "Entrar" / "Criar conta" buttons and completes the login when
 * the provider redirects back to /loja/entrar.
 */
import { readBlockConfig } from '../../scripts/aem.js';
import {
  ACCOUNT_PAGE, FORGOT_PASSWORD_PAGE, LOGIN_PAGE, SIGNUP_PAGE,
  IS_UE, getRedirect, initializeAuth, isAuthenticated,
} from '../../scripts/commerce.js';

const FORMS = {
  'sign-in': ['SignIn', (next) => ({
    routeForgotPassword: () => FORGOT_PASSWORD_PAGE,
    routeSignUp: () => SIGNUP_PAGE,
    renderSignUpLink: true,
    routeRedirectOnSignIn: () => next,
  })],
  'sign-up': ['SignUp', (next) => ({
    hideCloseBtnOnEmailConfirmation: true,
    routeSignIn: () => LOGIN_PAGE,
    routeRedirectOnSignIn: () => next,
    routeRedirectOnEmailConfirmationClose: () => LOGIN_PAGE,
  })],
  'forgot-password': ['ResetPassword', () => ({
    routeSignIn: () => LOGIN_PAGE,
  })],
  'update-password': ['UpdatePassword', () => ({
    routeWrongUrlRedirect: () => FORGOT_PASSWORD_PAGE,
    routeSignInPage: () => LOGIN_PAGE,
  })],
};

/**
 * SSO panel: the identity provider page handles sign in, sign up and password reset, so
 * every form becomes an "Entrar" / "Criar conta" call to action.
 */
function renderSsoPanel(container, sso, { next, form }) {
  const signup = form === 'sign-up';
  const passwordForm = form === 'forgot-password' || form === 'update-password';
  const el = (tag, className, text) => {
    const e = document.createElement(tag);
    e.className = className;
    if (text) e.textContent = text;
    return e;
  };
  const button = (text, className, onSignup) => {
    const b = el('button', `button ${className}`, text);
    b.type = 'button';
    b.addEventListener('click', () => {
      b.disabled = true;
      sso.startLogin({ next, signup: onSignup });
    });
    return b;
  };

  const panel = el('div', 'commerce-auth-sso');
  panel.append(
    el('h2', 'commerce-auth-sso-title', signup ? 'Criar conta' : 'Entrar'),
    el('p', 'commerce-auth-sso-text', passwordForm
      ? 'A senha é gerenciada na sua conta Sebrae. Na tela de login, use "Esqueceu a senha?".'
      : 'Use a sua conta Sebrae para se inscrever nos cursos, acompanhar os pedidos e estudar.'),
  );
  const actions = el('div', 'commerce-auth-sso-actions');
  actions.append(signup
    ? button('Criar conta Sebrae', 'primary', true)
    : button('Entrar com conta Sebrae', 'primary', false));
  actions.append(signup
    ? button('Já tenho conta', 'secondary', false)
    : button('Criar conta', 'secondary', true));
  panel.append(actions);
  container.append(panel);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const form = FORMS[config.form] ? config.form : 'sign-in';
  const next = getRedirect(config.redirect || ACCOUNT_PAGE);

  // authored rows stay in the DOM (hidden) so the block keeps its Universal Editor instrumentation
  const source = document.createElement('div');
  source.className = 'commerce-auth-source';
  source.append(...block.children);
  source.hidden = true;

  const container = document.createElement('div');
  container.className = 'commerce-auth-form';
  block.replaceChildren(container, source);

  const message = (text, className = 'commerce-auth-message') => {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = text;
    return p;
  };

  // single sign-on (identity provider): back from the provider login, or the "Entrar" button
  const sso = await import('../../scripts/sso.js');
  if (!IS_UE && sso.isCallback()) {
    container.replaceChildren(message('Entrando na sua conta…', 'commerce-auth-status'));
    try {
      window.location.replace(await sso.completeLogin());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('commerce-auth sso:', error);
      window.history.replaceState({}, '', window.location.pathname);
      container.replaceChildren(message(`Não foi possível entrar: ${error.message}.`));
      renderSsoPanel(container, sso, { next: ACCOUNT_PAGE, form: 'sign-in' });
    }
    return;
  }

  // already signed in: nothing to do here
  if (isAuthenticated() && form !== 'update-password' && !IS_UE) {
    window.location.replace(next);
    return;
  }

  if (await sso.isSsoEnabled().catch(() => false)) {
    renderSsoPanel(container, sso, { next, form });
    return;
  }

  try {
    await initializeAuth();
    const [name, props] = FORMS[form];
    const [{ render }, { default: Container }] = await Promise.all([
      import('@dropins/storefront-auth/render.js'),
      import(`@dropins/storefront-auth/containers/${name}.js`),
    ]);
    await render.render(Container, props(next))(container);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('commerce-auth:', error);
    container.replaceChildren(message('Não foi possível carregar o formulário no momento.'));
  }
}
