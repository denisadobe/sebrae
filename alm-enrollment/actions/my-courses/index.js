/*
 * my-courses — web action called by the site ("Meus cursos" block).
 * Authorization: Bearer {Commerce customer token}. The token is checked against Commerce;
 * the response has the customer's ALM courses and a short-lived ALM learner token used by
 * the site to open the ALM player for that customer only. Admin credentials stay here.
 */
const alm = require('../alm.js');
const commerce = require('../commerce.js');

const PLAYER_TOKEN_TTL = 3600; // seconds

// CORS: Adobe I/O Runtime adds Access-Control-Allow-Origin: * and answers the preflight
// (Authorization allowed) for web actions; adding our own header would duplicate it.
// The customer token is what protects the data, not the origin.
const response = (params, statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body,
});

async function main(params) {
  if (params.__ow_method === 'options') return response(params, 204, '');
  const auth = params.__ow_headers?.authorization || '';
  const customerToken = auth.replace(/^Bearer\s+/i, '').trim();
  if (!customerToken) return response(params, 401, { error: 'missing customer token' });

  try {
    const customer = await commerce.getCustomer(params, customerToken);
    if (!customer) return response(params, 401, { error: 'invalid customer token' });

    const learnerToken = await alm.getLearnerToken(params, customer.email, PLAYER_TOKEN_TTL);
    // not in ALM yet: no course ordered (or enrollment still being processed)
    if (!learnerToken) return response(params, 200, { courses: [] });

    const courses = await alm.listEnrollments(params, learnerToken, params.ALM_LOCALE || 'pt-BR');
    return response(params, 200, {
      courses,
      player: {
        baseUrl: alm.baseUrl(params),
        accessToken: learnerToken,
        expiresIn: PLAYER_TOKEN_TTL,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('my-courses failed', error.message, JSON.stringify(error.body || error.errors || {}));
    return response(params, 502, { error: 'courses unavailable' });
  }
}

module.exports = { main };
