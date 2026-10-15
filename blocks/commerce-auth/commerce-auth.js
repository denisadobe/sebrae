/*
 * Customer sign in / sign up / password forms (Adobe Commerce auth drop-in).
 * Authoring (key-value table):
 *   form     | sign-in (default), sign-up, forgot-password or update-password
 *   redirect | page after sign in (default /loja/conta; a ?redirect= on the URL wins)
 * update-password is the page of the "reset password" e-mail link (?email=&key=).
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

  // already signed in: nothing to do here
  if (isAuthenticated() && form !== 'update-password' && !IS_UE) {
    window.location.replace(next);
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
    const p = document.createElement('p');
    p.className = 'commerce-auth-message';
    p.textContent = 'Não foi possível carregar o formulário no momento.';
    container.replaceChildren(p);
  }
}
