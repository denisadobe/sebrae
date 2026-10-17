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

test('enroll: new customer -> external user + enrollment in the course', async () => {
  on(commerceProducts, productsReply);
  on((url) => url.endsWith('/oauth/token/refresh'), () => json({ access_token: 'admin' }));
  on((url) => new URL(url).searchParams.get('ids') === 'email:maria@example.com', () => json({ data: [] }));
  on((url, b, i) => url.endsWith('/externalProfiles/42/users') && i.method === 'POST', () => json({ data: { id: '777', type: 'user' } }));
  on((url) => url.includes('/learningObjects/course%3A123'), () => json({
    data: { id: 'course:123', relationships: { instances: { data: [{ id: 'course:123_1' }, { id: 'course:123_2' }] } } },
    included: [
      { id: 'course:123_1', type: 'learningObjectInstance', attributes: { isDefault: false, state: 'Active' } },
      { id: 'course:123_2', type: 'learningObjectInstance', attributes: { isDefault: true, state: 'Active' } },
    ],
  }));
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

test('enroll: existing user already enrolled is a success (event retry)', async () => {
  on(commerceProducts, productsReply);
  on((url) => url.endsWith('/oauth/token/refresh'), () => json({ access_token: 'admin' }));
  on((url) => new URL(url).searchParams.get('ids') === 'email:maria@example.com', () => json({ data: [{ id: '555', type: 'user' }] }));
  on((url) => url.includes('/learningObjects/'), () => json({
    data: { id: 'course:123', relationships: { instances: { data: [{ id: 'course:123_1' }] } } },
    included: [{ id: 'course:123_1', type: 'learningObjectInstance', attributes: { isDefault: true } }],
  }));
  on((url) => url.includes('/users/555/enrollments'), () => json({ source: { info: 'User is already enrolled' } }, 400));

  const res = await enroll.main({ ...PARAMS, ...ORDER_EVENT });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enrolled[0].status, 'already-enrolled');
  assert.ok(!calls.some((c) => c.url.includes('/externalProfiles/')));
  assert.ok(!calls.some((c) => c.url.includes('/oauth/o/learnerToken')));
});

test('enroll: order without courses does not call ALM', async () => {
  on(commerceProducts, () => json({ data: { products: [{ sku: 'CAMISETA', attributes: [] }] } }));
  const res = await enroll.main({ ...PARAMS, order: { customer_email: 'a@b.c', items: [{ sku: 'CAMISETA' }] } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enrolled.length, 0);
  assert.equal(calls.length, 1);
});

test('enroll: ALM failure returns 500 so the event is retried', async () => {
  on(commerceProducts, productsReply);
  on((url) => url.endsWith('/oauth/token/refresh'), () => json({ error: 'invalid' }, 401));
  const res = await enroll.main({ ...PARAMS, ...ORDER_EVENT });
  assert.equal(res.statusCode, 500);
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

test('my-courses: lists the courses of the customer + player token', async () => {
  on((url, body) => body.includes('customer {'), (url, body, init) => {
    assert.equal(init.headers.Authorization, 'Bearer good');
    return json({ data: { customer: { email: 'maria@example.com', firstname: 'Maria', lastname: 'Silva' } } });
  });
  on((url) => url.includes('/oauth/o/learnerToken'), (url, body) => {
    assert.deepEqual(JSON.parse(body), { email: 'maria@example.com', ttl: 3600 });
    return json({ access_token: 'learner' });
  });
  on((url) => url.includes('/primeapi/v2/enrollments'), () => json({
    data: [{ id: 'e1', attributes: { state: 'ENROLLED', progressPercent: 40 }, relationships: { learningObject: { data: { id: 'course:123' } } } }],
    included: [{
      id: 'course:123',
      type: 'learningObject',
      attributes: { imageUrl: 'https://img', duration: 600, localizedMetadata: [{ locale: 'en-US', name: 'Sales' }, { locale: 'pt-BR', name: 'Vendas' }] },
    }],
  }));
  const res = await myCourses.main({
    ...PARAMS,
    __ow_headers: { authorization: 'Bearer good', origin: 'https://main--sebrae--denisadobe.aem.page' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(res.body.courses[0].name, 'Vendas');
  assert.equal(res.body.courses[0].progress, 40);
  assert.equal(res.body.player.accessToken, 'learner');
});

test('my-courses: customer not in ALM yet -> no courses', async () => {
  on((url, body) => body.includes('customer {'), () => json({ data: { customer: { email: 'novo@example.com' } } }));
  on((url) => url.includes('/oauth/o/learnerToken'), () => json({}, 404));
  const res = await myCourses.main({ ...PARAMS, __ow_headers: { authorization: 'Bearer good' } });
  assert.deepEqual(res.body, { courses: [] });
});
