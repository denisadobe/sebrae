/* ALM learner connection through SSO: alm-connect (code -> sealed session) and my-courses using it. */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const almConnect = require('../actions/alm-connect/index.js');
const myCourses = require('../actions/my-courses/index.js');
const sso = require('../actions/sso.js');
const learnerSession = require('../actions/learner-session.js');

const PARAMS = {
  ALM_CLIENT_ID: 'id',
  ALM_CLIENT_SECRET: 'secret',
  ALM_REFRESH_TOKEN: 'admin-refresh',
  ALM_SESSION_SECRET: 'session-key',
  COMMERCE_GRAPHQL_URL: 'https://commerce.test/graphql',
};
const AUTH = { __ow_headers: { authorization: 'Bearer customer-token' } };
const ENROLLMENTS = {
  data: [{ id: 'e1', attributes: { state: 'STARTED', progressPercent: 10 }, relationships: { learningObject: { data: { id: 'course:5444798' } } } }],
  included: [{ id: 'course:5444798', type: 'learningObject', attributes: { localizedMetadata: [{ locale: 'en-US', name: 'Vector Illustration' }] } }],
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
    calls.push({ url, body, headers: init.headers || {} });
    const route = routes.find(([match]) => match(url, body, init));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return route[1](url, body, init);
  };
});
const on = (match, reply) => routes.push([match, reply]);
const customer = (email = 'teste@adobe.com') => on((url, body) => body.includes('customer {'), () => json({ data: { customer: { email } } }));

test('seal / unseal: round trip; tampered or other key -> null', () => {
  const sealed = sso.seal('k', { a: 1 });
  assert.deepEqual(sso.unseal('k', sealed), { a: 1 });
  assert.equal(sso.unseal('other', sealed), null);
  const raw = Buffer.from(sealed, 'base64url');
  raw[raw.length - 1] = (raw[raw.length - 1] + 1) % 256;
  assert.equal(sso.unseal('k', raw.toString('base64url')), null);
  assert.equal(sso.unseal('k', 'garbage'), null);
});

test('alm-connect: code -> learner tokens, e-mail checked, sealed session + player', async () => {
  customer();
  on((url, body) => url.endsWith('/oauth/token') && body.includes('code=abc'), () => json({ access_token: 'learner-at', refresh_token: 'learner-rt', expires_in: 604800 }));
  on((url, b, init) => url.endsWith('/primeapi/v2/user') && init.headers.Authorization === 'oauth learner-at', () => json({ data: { id: '43551175', attributes: { email: 'Teste@Adobe.com' } } }));
  const res = await almConnect.main({ ...PARAMS, ...AUTH, code: 'abc' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.player.accessToken, 'learner-at');
  const value = sso.unseal('session-key', res.body.session);
  assert.equal(value.email, 'teste@adobe.com');
  assert.equal(value.refreshToken, 'learner-rt');
  assert.ok(!res.body.session.includes('learner-rt'), 'tokens are not readable in the sealed value');
});

test('alm-connect: ALM account of another e-mail -> 403, no session', async () => {
  customer('teste@adobe.com');
  on((url) => url.endsWith('/oauth/token'), () => json({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }));
  on((url) => url.endsWith('/primeapi/v2/user'), () => json({ data: { id: '1', attributes: { email: 'outra.pessoa@adobe.com' } } }));
  const res = await almConnect.main({ ...PARAMS, ...AUTH, code: 'abc' });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.session, undefined);
});

test('alm-connect: missing customer token / code -> 401 / 400', async () => {
  assert.equal((await almConnect.main({ ...PARAMS, code: 'abc' })).statusCode, 401);
  assert.equal((await almConnect.main({ ...PARAMS, ...AUTH })).statusCode, 400);
});

const noImpersonation = () => on((url) => url.includes('/oauth/o/learnerToken'), () => json({ title: 'not enabled' }, 401));

test('my-courses: valid sealed session -> learner enrollments + player, no admin calls', async () => {
  customer();
  noImpersonation();
  on((url, b, init) => url.includes('/primeapi/v2/enrollments') && init.headers.Authorization === 'oauth learner-at', () => json(ENROLLMENTS));
  const almSession = learnerSession.sealSession(PARAMS, 'teste@adobe.com', {
    accessToken: 'learner-at', refreshToken: 'learner-rt', expiresAt: Date.now() + 86400000,
  });
  const res = await myCourses.main({ ...PARAMS, ...AUTH, almSession });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.player.accessToken, 'learner-at');
  assert.equal(res.body.courses[0].name, 'Vector Illustration');
  assert.equal(res.body.session, undefined, 'unchanged session is not returned');
  assert.ok(!calls.some((c) => c.url.endsWith('/oauth/token/refresh')));
});

test('my-courses: expired access token -> refreshed with the learner refresh token, new session returned', async () => {
  customer();
  noImpersonation();
  on((url, body) => url.endsWith('/oauth/token/refresh') && body.includes('refresh_token=learner-rt'), () => json({ access_token: 'new-at', expires_in: 604800 }));
  on((url) => url.includes('/primeapi/v2/enrollments'), () => json(ENROLLMENTS));
  const almSession = learnerSession.sealSession(PARAMS, 'teste@adobe.com', {
    accessToken: 'old-at', refreshToken: 'learner-rt', expiresAt: Date.now() - 1000,
  });
  const res = await myCourses.main({ ...PARAMS, ...AUTH, almSession });
  assert.equal(res.body.player.accessToken, 'new-at');
  assert.equal(sso.unseal('session-key', res.body.session).accessToken, 'new-at');
  assert.equal(sso.unseal('session-key', res.body.session).refreshToken, 'learner-rt');
});

test('my-courses: session of another customer is ignored -> admin list + connect', async () => {
  customer('teste@adobe.com');
  noImpersonation();
  on((url) => url.endsWith('/oauth/token/refresh'), () => json({ access_token: 'admin', account_id: '115171' }));
  on((url) => new URL(url).searchParams.get('ids') === 'email:teste@adobe.com', () => json({ data: [{ id: '43551175', type: 'user' }] }));
  on((url) => url.includes('/users/43551175/enrollments'), () => json(ENROLLMENTS));
  const almSession = learnerSession.sealSession(PARAMS, 'outra@adobe.com', {
    accessToken: 'stolen', refreshToken: 'x', expiresAt: Date.now() + 86400000,
  });
  const res = await myCourses.main({ ...PARAMS, ...AUTH, almSession });
  assert.equal(res.body.player, undefined);
  assert.equal(res.body.connect, true);
  assert.match(res.body.courses[0].url, /app\/learner\?accountId=115171#\/course\/5444798/);
  assert.ok(!calls.some((c) => c.headers.Authorization === 'oauth stolen'));
});
