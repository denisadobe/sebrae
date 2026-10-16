/* Unit tests with a mocked fetch: `npm test` (node:test, no dependencies). */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const enroll = require('../actions/enroll/index.js');
const myCourses = require('../actions/my-courses/index.js');
const alm = require('../actions/alm.js');

const PARAMS = {
  ALM_CLIENT_ID: 'id',
  ALM_CLIENT_SECRET: 'secret',
  ALM_REFRESH_TOKEN: 'refresh',
  ALM_EXTERNAL_PROFILE_ID: '42',
  COMMERCE_GRAPHQL_URL: 'https://commerce.test/graphql',
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

let calls;
let routes;
beforeEach(() => {
  calls = [];
  routes = [];
  global.fetch = async (input, init = {}) => {
    const url = String(input);
    const body = init.body ? String(init.body) : '';
    calls.push({
      url, method: init.method || 'GET', body, headers: init.headers || {},
    });
    const route = routes.find(([match]) => match(url, body, init));
    if (!route) throw new Error(`unexpected fetch ${init.method || 'GET'} ${url}`);
    return route[1](url, body, init);
  };
});
const on = (match, reply) => routes.push([match, reply]);

const ORDER_EVENT = {
  data: {
    value: {
      increment_id: '000000002',
      customer_email: 'maria@example.com',
      customer_firstname: 'Maria',
      customer_lastname: 'Silva',
      items: [{ sku: 'CURSO-1' }, { sku: 'CAMISETA' }, { sku: 'CURSO-1' }],
    },
  },
};

const commerceProducts = (url, body) => url.startsWith(PARAMS.COMMERCE_GRAPHQL_URL) && body.includes('products(skus');
const productsReply = () => json({
  data: {
    products: [
      { sku: 'CURSO-1', attributes: [{ name: 'alm_course_id', value: '123' }] },
      { sku: 'CAMISETA', attributes: [{ name: 'weight', value: 1 }] },
    ],
  },
});

test('toLoId normalizes plain ids', () => {
  assert.equal(alm.toLoId('123'), 'course:123');
  assert.equal(alm.toLoId('learningProgram:9'), 'learningProgram:9');
  assert.equal(alm.toLoId(' '), null);
});

test('getSkus keeps unique SKUs', () => {
  assert.deepEqual(enroll.getSkus(ORDER_EVENT.data.value), ['CURSO-1', 'CAMISETA']);
});

const adminToken = () => on((url) => url.endsWith('/oauth/token/refresh'), () => json({ access_token: 'admin', account_id: '115171' }));
const noImpersonation = () => on((url) => url.includes('/oauth/o/learnerToken'), () => json({ title: 'Learner impersonation not enabled' }, 403));
const usersPage = (users, next) => json({
  data: users.map(([id, email]) => ({ id, type: 'user', attributes: { email } })),
  links: next ? { next: `https://learningmanager.adobe.com/primeapi/v2/users?page[limit]=10&page[cursor]=${next}` } : {},
});
const courseInstances = () => on((url) => url.includes('/learningObjects/course%3A123'), () => json({
  data: { id: 'course:123', relationships: { instances: { data: [{ id: 'course:123_1' }, { id: 'course:123_2' }] } } },
  included: [
    { id: 'course:123_1', type: 'learningObjectInstance', attributes: { isDefault: false, state: 'Active' } },
    { id: 'course:123_2', type: 'learningObjectInstance', attributes: { isDefault: true, state: 'Active' } },
  ],
}));
const ENROLLMENTS = {
  data: [{ id: 'e1', attributes: { state: 'ENROLLED', progressPercent: 40 }, relationships: { learningObject: { data: { id: 'course:123' } } } }],
  included: [{
    id: 'course:123',
    type: 'learningObject',
    attributes: { imageUrl: 'https://img', duration: 600, localizedMetadata: [{ locale: 'en-US', name: 'Sales' }, { locale: 'pt-BR', name: 'Vendas' }] },
  }],
};
const customerOk = (email = 'maria@example.com') => on((url, body) => body.includes('customer {'), (url, body, init) => {
  assert.equal(init.headers.Authorization, 'Bearer good');
  return json({ data: { customer: { email, firstname: 'Maria', lastname: 'Silva' } } });
});

test('learner token request follows the ALM docs (e-mail in the query, credentials in the body)', async () => {
  on((url) => url.includes('/oauth/o/learnerToken'), (url, body) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get('learner_email'), 'maria@example.com');
    assert.equal(query.get('force'), 'false');
    assert.ok(!url.includes('secret'));
    assert.deepEqual(JSON.parse(body), { client_id: 'id', client_secret: 'secret', refresh_token: 'refresh' });
    return json({ access_token: 'learner', user_id: 555, expires_in: 604800 });
  });
  assert.deepEqual(await alm.getLearnerToken(PARAMS, 'maria@example.com'), { accessToken: 'learner', userId: '555', expiresIn: 604800 });
});

test('enroll: new customer -> external user + enrollment in the course', async () => {
  on(commerceProducts, productsReply);
  adminToken();
  noImpersonation();
  on((url) => url.includes('/primeapi/v2/users?'), () => usersPage([['1', 'admin@sebrae.com.br']]));
  on((url, b, i) => url.endsWith('/externalProfiles/42/users') && i.method === 'POST', () => json({ data: { id: '777', type: 'user' } }));
  courseInstances();
  on((url, b, i) => url.includes('/users/777/enrollments') && i.method === 'POST', () => json({ data: { id: 'enr1' } }));

  const res = await enroll.main({ ...PARAMS, ...ORDER_EVENT });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.enrolled, [{
    loId: 'course:123', loInstanceId: 'course:123_2', enrollmentId: 'enr1', status: 'enrolled',
  }]);
  const create = calls.find((c) => c.url.endsWith('/externalProfiles/42/users'));
  assert.deepEqual(JSON.parse(create.body).data.attributes, { email: 'maria@example.com', name: 'Maria Silva', userType: 'EXTERNAL' });
  const enrollCall = calls.find((c) => c.url.includes('/users/777/enrollments'));
  const query = new URL(enrollCall.url).searchParams;
  assert.equal(query.get('loId'), 'course:123');
  assert.equal(query.get('loInstanceId'), 'course:123_2');
  assert.equal(enrollCall.headers.Authorization, 'oauth admin');
});

test('enroll: existing user found by the admin lookup (no impersonation), no user created', async () => {
  on(commerceProducts, productsReply);
  adminToken();
  noImpersonation();
  on((url) => url.includes('/primeapi/v2/users?') && !url.includes('cursor'), () => usersPage([['1', 'a@b.c']], 'c2'));
  on((url) => url.includes('page%5Bcursor%5D=c2'), () => usersPage([['888', 'Maria@Example.com']]));
  courseInstances();
  on((url, b, i) => url.includes('/users/888/enrollments') && i.method === 'POST', () => json({ data: { id: 'enr2' } }));

  const res = await enroll.main({ ...PARAMS, ...ORDER_EVENT });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.userId, '888');
  assert.equal(res.body.enrolled[0].status, 'enrolled');
  assert.ok(!calls.some((c) => c.url.includes('/externalProfiles/')));
});

test('enroll: user id from the learner token; already enrolled is a success (event retry)', async () => {
  on(commerceProducts, productsReply);
  adminToken();
  on((url) => url.includes('/oauth/o/learnerToken'), () => json({ access_token: 'learner', user_id: '555' }));
  on((url) => url.includes('/learningObjects/'), () => json({
    data: { id: 'course:123', relationships: { instances: { data: [{ id: 'course:123_1' }] } } },
    included: [{ id: 'course:123_1', type: 'learningObjectInstance', attributes: { isDefault: true } }],
  }));
  on((url) => url.includes('/users/555/enrollments'), () => json({ source: { info: 'User is already enrolled' } }, 400));

  const res = await enroll.main({ ...PARAMS, ...ORDER_EVENT });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enrolled[0].status, 'already-enrolled');
  assert.ok(!calls.some((c) => c.url.includes('/externalProfiles/') || c.url.includes('/primeapi/v2/users?')));
});

test('enroll: order without courses does not call ALM', async () => {
  on(commerceProducts, () => json({ data: { products: [{ sku: 'CAMISETA', attributes: [] }] } }));
  const res = await enroll.main({ ...PARAMS, order: { customer_email: 'a@b.c', items: [{ sku: 'CAMISETA' }] } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enrolled.length, 0);
  assert.equal(calls.length, 1);
});

test('enroll: ALM failure returns 500 with the ALM detail so the event is retried', async () => {
  on(commerceProducts, productsReply);
  adminToken();
  noImpersonation();
  on((url) => url.includes('/primeapi/v2/users?'), () => usersPage([]));
  on((url) => url.endsWith('/externalProfiles/42/users'), () => json({ status: 'BAD_REQUEST', title: 'Generic Error', source: { info: 'Profile is disabled' } }, 400));
  const res = await enroll.main({ ...PARAMS, ...ORDER_EVENT });
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /externalProfiles\/42\/users failed \(400\).*Profile is disabled/);
});

test('my-courses: rejects missing or invalid customer token', async () => {
  assert.equal((await myCourses.main({ ...PARAMS, __ow_headers: {} })).statusCode, 401);
  on((url, body) => body.includes('customer {'), () => json({ errors: [{ message: 'not authorized', extensions: { category: 'graphql-authorization' } }] }));
  const res = await myCourses.main({ ...PARAMS, __ow_headers: { authorization: 'Bearer bad' } });
  assert.equal(res.statusCode, 401);
  routes.length = 0;
  on((url, body) => body.includes('customer {'), () => json({ data: null, errors: [{ message: 'Composite reader could not read a token', extensions: { category: 'graphql-authentication' } }] }));
  assert.equal((await myCourses.main({ ...PARAMS, __ow_headers: { authorization: 'Bearer garbage' } })).statusCode, 401);
});

test('my-courses: with learner impersonation -> courses + player token', async () => {
  customerOk();
  on((url) => url.includes('/oauth/o/learnerToken'), () => json({ access_token: 'learner', user_id: '555', expires_in: 3600 }));
  on((url) => url.includes('/primeapi/v2/enrollments'), () => json(ENROLLMENTS));
  const res = await myCourses.main({ ...PARAMS, __ow_headers: { authorization: 'Bearer good' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(res.body.courses[0].name, 'Vendas');
  assert.equal(res.body.courses[0].progress, 40);
  assert.equal(res.body.player.accessToken, 'learner');
});

test('my-courses: without impersonation -> courses via admin API with ALM learner app links', async () => {
  customerOk();
  noImpersonation();
  adminToken();
  on((url) => url.includes('/primeapi/v2/users?'), () => usersPage([['555', 'maria@example.com']]));
  on((url, b, i) => url.includes('/users/555/enrollments') && (i.method || 'GET') === 'GET', () => json(ENROLLMENTS));
  const res = await myCourses.main({ ...PARAMS, __ow_headers: { authorization: 'Bearer good' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.player, undefined);
  assert.equal(res.body.courses[0].name, 'Vendas');
  assert.equal(res.body.courses[0].url, 'https://learningmanager.adobe.com/app/learner?accountId=115171#/course/123');
});

test('my-courses: customer not in ALM yet -> no courses', async () => {
  customerOk('novo@example.com');
  noImpersonation();
  adminToken();
  on((url) => url.includes('/primeapi/v2/users?'), () => usersPage([['1', 'outro@example.com']]));
  const res = await myCourses.main({ ...PARAMS, __ow_headers: { authorization: 'Bearer good' } });
  assert.deepEqual(res.body, { courses: [] });
});
