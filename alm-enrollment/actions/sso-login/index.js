/*
 * sso-login — web action called by the site after the shopper signs in with the identity
 * provider (Auth0, OIDC). POST { idToken }: the ID token is validated (signature, issuer,
 * audience, expiry, verified e-mail) and exchanged for a Commerce customer token with
 * exchangeExternalCustomerToken (creates the customer on first login). The site stores the
 * token like the auth drop-in does, so cart, checkout and account keep working unchanged.
 */
const sso = require('../sso.js');
const commerce = require('../commerce.js');

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body,
});

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
  // the Commerce account is matched by e-mail: only verified e-mails can sign in
  if (!claims.email || claims.email_verified !== true) {
    return response(403, { error: 'email not verified', email: claims.email || null });
  }

  try {
    const { firstname, lastname } = sso.getNames(claims);
    const data = await commerce.graphql(params, `mutation ($customer: CustomerCreateInput!) {
      exchangeExternalCustomerToken(input: { customer: $customer }) {
        token
        customer { email firstname lastname }
      }
    }`, {
      customer: {
        email: claims.email, firstname, lastname, is_subscribed: false,
      },
    }, await sso.commerceAdminHeaders(params));
    const { token, customer } = data.exchangeExternalCustomerToken || {};
    if (!token) throw new Error('no customer token');
    return response(200, { token, customer });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('sso-login failed', claims.email, error.message, JSON.stringify(error.errors || {}));
    return response(502, { error: `commerce login failed: ${error.message}` });
  }
}

module.exports = { main };
