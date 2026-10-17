/*
 * my-courses — web action called by the site ("Meus cursos" block).
 * Authorization: Bearer {Commerce customer token}. The token is checked against Commerce;
 * the response has the customer's ALM courses and a learner token used by the site to open the
 * ALM player for that customer only, from (1) learner impersonation, when ALM allows it, or
 * (2) the learner connection made through single sign-on (POST { almSession }, sealed by
 * alm-connect). Without either, courses come from the admin API with links to the ALM learner
 * app and `connect: true` tells the site to offer the SSO connection. Admin credentials stay here.
 */
const alm = require('../alm.js');
const commerce = require('../commerce.js');
const learnerSession = require('../learner-session.js');

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

    const locale = params.ALM_LOCALE || 'pt-BR';
    // embedded player: learner token for the customer (learner impersonation enabled in ALM)
    const learner = await alm.getLearnerToken(params, customer.email);
    if (learner) {
      const courses = await alm.listEnrollments(params, learner.accessToken, locale);
      return response(params, 200, {
        courses,
        player: {
          baseUrl: alm.baseUrl(params),
          accessToken: learner.accessToken,
          expiresIn: learner.expiresIn,
        },
      });
    }

    // learner connection made through single sign-on (sealed session kept by the browser)
    const connected = await learnerSession.openSession(params, params.almSession, customer.email);
    if (connected) {
      const courses = await alm.listEnrollments(params, connected.accessToken, locale);
      return response(params, 200, {
        courses,
        player: {
          baseUrl: alm.baseUrl(params),
          accessToken: connected.accessToken,
          expiresIn: Math.round((connected.expiresAt - Date.now()) / 1000),
        },
        ...(connected.session && { session: connected.session }),
      });
    }

    // no learner token: courses through the admin API, opened in the ALM learner app
    const admin = await alm.getAdminSession(params);
    const userId = await alm.findUserIdByAdmin(params, admin.token, customer.email);
    // not in ALM yet: no course ordered (or enrollment still being processed)
    if (!userId) return response(params, 200, { courses: [] });
    const courses = (await alm.listUserEnrollments(params, admin.token, userId, locale))
      .map((course) => ({ ...course, url: alm.courseUrl(params, course.loId, admin.accountId) }));
    // connect: the site can get a learner token through the SSO login (alm-connect)
    return response(params, 200, { courses, connect: !!params.ALM_SESSION_SECRET });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('my-courses failed', error.message, JSON.stringify(error.body || error.errors || {}));
    return response(params, 502, { error: 'courses unavailable' });
  }
}

module.exports = { main };
