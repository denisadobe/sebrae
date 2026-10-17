/*
 * alm-connect — web action called by the site when ALM sends the learner back with an OAuth
 * code (after the silent SSO login: identity provider -> ALM -> authorize -> site).
 * POST { code }, Authorization: Bearer {Commerce customer token}.
 * Exchanges the code for the learner's ALM tokens, checks that the ALM account e-mail is the
 * customer's e-mail, and returns them sealed (kept by the browser) plus the player token.
 */
const alm = require('../alm.js');
const commerce = require('../commerce.js');
const learnerSession = require('../learner-session.js');

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body,
});

async function main(params) {
  const customerToken = (params.__ow_headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!customerToken) return response(401, { error: 'missing customer token' });
  if (!params.code) return response(400, { error: 'missing code' });
  if (!params.ALM_SESSION_SECRET) return response(500, { error: 'ALM_SESSION_SECRET not configured' });

  try {
    const customer = await commerce.getCustomer(params, customerToken);
    if (!customer) return response(401, { error: 'invalid customer token' });

    const tokens = await alm.exchangeCode(params, params.code);
    const { data } = await alm.api(params, tokens.accessToken, '/user');
    const almEmail = data?.attributes?.email;
    // the ALM session must be the customer's own learner account
    if (!learnerSession.sameEmail(almEmail, customer.email)) {
      return response(403, { error: 'ALM account e-mail differs from the store account', almEmail });
    }
    return response(200, {
      session: learnerSession.sealSession(params, customer.email, tokens),
      player: {
        baseUrl: alm.baseUrl(params),
        accessToken: tokens.accessToken,
        expiresIn: Math.round((tokens.expiresAt - Date.now()) / 1000),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('alm-connect failed', error.message, JSON.stringify(error.body || error.errors || {}));
    return response(502, { error: `ALM connection failed: ${error.message}` });
  }
}

module.exports = { main };
