/*
 * sso-login — web action called by the site after the shopper signs in with the identity
 * provider (Auth0, OIDC). POST { idToken }: the ID token is validated (signature, issuer,
 * audience, expiry, verified e-mail) and exchanged for a Commerce customer token. The site
 * stores the token like the auth drop-in does, so cart, checkout and account keep working.
 *
 * Commerce side (SSO_COMMERCE_MODE):
 *   exchange — exchangeExternalCustomerToken with an IMS server-to-server token (commerce.accs):
 *              the official way, needs that credential (IMS_CLIENT_ID / IMS_CLIENT_SECRET)
 *   password — interim, no admin credential: a per-customer password derived from
 *              SSO_PASSWORD_SECRET (HMAC of the e-mail) is used with the public storefront
 *              API (createCustomerV2 on first login, then generateCustomerToken). Accounts
 *              created before with their own password cannot sign in this way.
 */
const crypto = require('crypto');
const sso = require('../sso.js');
const commerce = require('../commerce.js');

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body,
});

class LoginError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const getMode = (params) => params.SSO_COMMERCE_MODE || (params.SSO_PASSWORD_SECRET ? 'password' : 'exchange');

/** Internal password of a customer: always the same for the e-mail, meets Commerce rules. */
function derivePassword(secret, email) {
  const digest = crypto.createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('base64url');
  return `${digest.slice(0, 28)}Aa1!`;
}

async function exchangeToken(params, customer) {
  const data = await commerce.graphql(params, `mutation ($customer: CustomerCreateInput!) {
    exchangeExternalCustomerToken(input: { customer: $customer }) {
      token
      customer { email firstname lastname }
    }
  }`, { customer: { ...customer, is_subscribed: false } }, await sso.commerceAdminHeaders(params));
  return data.exchangeExternalCustomerToken || {};
}

async function passwordToken(params, customer) {
  if (!params.SSO_PASSWORD_SECRET) throw new LoginError('SSO_PASSWORD_SECRET not configured', 500);
  const password = derivePassword(params.SSO_PASSWORD_SECRET, customer.email);
  // create first (no failed sign-in attempts counted against the account); existing = sign in
  try {
    await commerce.graphql(params, `mutation ($input: CustomerCreateInput!) {
      createCustomerV2(input: $input) { customer { email } }
    }`, { input: { ...customer, password, is_subscribed: false } });
  } catch (error) {
    const exists = (error.errors || []).some((e) => /already exists/i.test(e.message || ''));
    if (!exists) throw error;
  }
  try {
    const data = await commerce.graphql(params, `mutation ($email: String!, $password: String!) {
      generateCustomerToken(email: $email, password: $password) { token }
    }`, { email: customer.email, password });
    return { token: data.generateCustomerToken?.token, customer };
  } catch (error) {
    const authError = (error.errors || []).some((e) => e.extensions?.category === 'graphql-authentication'
      || /sign-in was incorrect|account is disabled/i.test(e.message || ''));
    if (authError) {
      throw new LoginError('account exists with its own password (created before single sign-on)', 409);
    }
    throw error;
  }
}

/** Commerce customer token for a verified identity ({ email, firstname, lastname }). */
async function getCustomerToken(params, customer) {
  const result = getMode(params) === 'password'
    ? await passwordToken(params, customer)
    : await exchangeToken(params, customer);
  if (!result.token) throw new Error('no customer token');
  return result;
}

async function main(params) {
  const idToken = params.idToken || params.id_token;
  if (!idToken) return response(400, { error: 'missing idToken' });

  let claims;
  try {
    claims = await sso.verifyIdToken(idToken, {
      issuer: `https://${params.SSO_DOMAIN}/`,
      audience: params.SSO_CLIENT_ID,
    });
  } catch (error) {
    return response(401, { error: `invalid identity token: ${error.message}` });
  }
  // the Commerce account is matched by e-mail: only verified e-mails can sign in, unless the
  // demo turns it off (SSO_REQUIRE_VERIFIED_EMAIL=false: anyone who registers an e-mail in the
  // identity provider gets that e-mail's store account)
  const requireVerified = String(params.SSO_REQUIRE_VERIFIED_EMAIL ?? 'true') !== 'false';
  if (!claims.email || (requireVerified && claims.email_verified !== true)) {
    return response(403, { error: 'email not verified', email: claims.email || null });
  }

  try {
    const { token, customer } = await getCustomerToken(params, { email: claims.email, ...sso.getNames(claims) });
    return response(200, { token, customer });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('sso-login failed', claims.email, getMode(params), error.message, JSON.stringify(error.errors || {}));
    if (error.status === 409) return response(409, { error: error.message, email: claims.email });
    return response(502, { error: `commerce login failed: ${error.message}` });
  }
}

module.exports = {
  main, getCustomerToken, derivePassword, getMode,
};
