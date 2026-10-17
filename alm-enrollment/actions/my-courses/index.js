/*
 * my-courses — web action called by the site ("Meus cursos" block).
 * Authorization: Bearer {Commerce customer token}. The token is checked against Commerce;
 * the response has the customer's ALM courses and, when ALM allows learner impersonation, a
 * learner token used by the site to open the ALM player for that customer only; otherwise each
 * course has the URL of its page in the ALM learner app. Admin credentials stay here.
 */
const alm = require('../alm.js');
const commerce = require('../commerce.js');

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

    // no impersonation: courses through the admin API, opened in the ALM learner app
    const admin = await alm.getAdminSession(params);
    const userId = await alm.findUserIdByAdmin(params, admin.token, customer.email);
    // not in ALM yet: no course ordered (or enrollment still being processed)
    if (!userId) return response(params, 200, { courses: [] });
    const courses = (await alm.listUserEnrollments(params, admin.token, userId, locale))
      .map((course) => ({ ...course, url: alm.courseUrl(params, course.loId, admin.accountId) }));
    return response(params, 200, { courses });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('my-courses failed', error.message, JSON.stringify(error.body || error.errors || {}));
    return response(params, 502, { error: 'courses unavailable' });
  }
}

module.exports = { main };
