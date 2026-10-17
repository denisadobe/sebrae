/* sso-login: ID token validation + Commerce exchange, with a locally signed RS256 token. */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const ssoLogin = require('../actions/sso-login/index.js');
const sso = require('../actions/sso.js');

const DOMAIN = 'tenant.test.auth0.com';
const PARAMS = {
  SSO_DOMAIN: DOMAIN,
  SSO_CLIENT_ID: 'site-client',
  IMS_CLIENT_ID: 'ims-id',
  IMS_CLIENT_SECRET: 'ims-secret',
  IMS_ORG_ID: 'ORG@AdobeOrg',
  COMMERCE_GRAPHQL_URL: 'https://commerce.test/graphql',
};

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const JWK = {
  ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig',
};
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function idToken(claims = {}, { key = privateKey, kid = 'k1' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'RS256', typ: 'JWT', kid });
  const body = b64({
    iss: `https://${DOMAIN}/`,
    aud: 'site-client',
    exp: now + 600,
    iat: now,
    email: 'maria@example.com',
    email_verified: true,
    given_name: 'Maria',
    family_name: 'Silva',
    ...claims,
  });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url');
  return `${head}.${body}.${sig}`;
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
let calls;
beforeEach(() => {
  calls = [];
  global.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === `https://${DOMAIN}/.well-known/jwks.json`) return json({ keys: [JWK] });
    if (url.startsWith('https://ims-na1.adobelogin.com/')) return json({ access_token: 'ims-token', expires_in: 86399 });
    if (url === PARAMS.COMMERCE_GRAPHQL_URL) {
      const { variables } = JSON.parse(init.body);
      return json({ data: { exchangeExternalCustomerToken: { token: 'customer-token', customer: variables.customer } } });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
});

test('valid ID token -> Commerce customer token (exchangeExternalCustomerToken with IMS auth)', async () => {
  const res = await ssoLogin.main({ ...PARAMS, idToken: idToken() });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, 'customer-token');
  assert.deepEqual(res.body.customer, {
    email: 'maria@example.com', firstname: 'Maria', lastname: 'Silva', is_subscribed: false,
  });
  const gql = calls.find((c) => c.url === PARAMS.COMMERCE_GRAPHQL_URL);
  assert.equal(gql.init.headers.Authorization, 'Bearer ims-token');
  assert.equal(gql.init.headers['x-api-key'], 'ims-id');
  assert.equal(gql.init.headers['x-gw-ims-org-id'], 'ORG@AdobeOrg');
  assert.match(JSON.parse(gql.init.body).query, /exchangeExternalCustomerToken/);
  const ims = calls.find((c) => c.url.startsWith('https://ims-na1'));
  assert.match(String(ims.init.body), /commerce\.accs/);
});

test('rejects tokens with a bad signature, wrong audience, wrong issuer or expired', async () => {
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const cases = [
    idToken({}, { key: other }),
    idToken({ aud: 'another-app' }),
    idToken({ iss: 'https://evil.example.com/' }),
    idToken({ exp: Math.floor(Date.now() / 1000) - 3600 }),
    'not-a-jwt',
  ];
  // eslint-disable-next-line no-restricted-syntax
  for (const token of cases) {
    // eslint-disable-next-line no-await-in-loop
    const res = await ssoLogin.main({ ...PARAMS, idToken: token });
    assert.equal(res.statusCode, 401, token.slice(0, 20));
  }
  assert.ok(!calls.some((c) => c.url === PARAMS.COMMERCE_GRAPHQL_URL));
});

test('unverified e-mail cannot sign in (account takeover by e-mail)', async () => {
  const res = await ssoLogin.main({ ...PARAMS, idToken: idToken({ email_verified: false }) });
  assert.equal(res.statusCode, 403);
  assert.ok(!calls.some((c) => c.url === PARAMS.COMMERCE_GRAPHQL_URL));
});

test('missing token -> 400; Commerce permission error -> 502 with detail', async () => {
  assert.equal((await ssoLogin.main(PARAMS)).statusCode, 400);
  global.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/jwks.json')) return json({ keys: [JWK] });
    if (url.startsWith('https://ims-na1')) return json({ access_token: 'ims-token', expires_in: 86399 });
    return json({ errors: [{ message: 'You do not have permission to access this resource.' }] });
  };
  const res = await ssoLogin.main({ ...PARAMS, idToken: idToken() });
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /permission/);
});

test('names fall back when the provider has no given/family name (Auth0 database users)', () => {
  assert.deepEqual(sso.getNames({ email: 'joao.souza@example.com', name: 'joao.souza@example.com', nickname: 'joao.souza' }), {
    firstname: 'joao.souza', lastname: 'Sebrae',
  });
  assert.deepEqual(sso.getNames({ email: 'a@b.c', name: 'Ana Paula Lima' }), { firstname: 'Ana', lastname: 'Paula Lima' });
});

test('password mode: new customer -> createCustomerV2 then generateCustomerToken with the derived password', async () => {
  const seen = [];
  global.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/jwks.json')) return json({ keys: [JWK] });
    const { query, variables } = JSON.parse(init.body);
    seen.push({ query, variables, auth: init.headers.Authorization });
    if (query.includes('createCustomerV2')) return json({ data: { createCustomerV2: { customer: { email: variables.input.email } } } });
    if (query.includes('generateCustomerToken')) return json({ data: { generateCustomerToken: { token: 'pw-token' } } });
    throw new Error(`unexpected ${url}`);
  };
  const params = { ...PARAMS, SSO_COMMERCE_MODE: 'password', SSO_PASSWORD_SECRET: 's3cret' };
  const res = await ssoLogin.main({ ...params, idToken: idToken() });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, 'pw-token');
  const password = ssoLogin.derivePassword('s3cret', 'maria@example.com');
  assert.equal(seen[0].variables.input.password, password);
  assert.equal(seen[1].variables.password, password);
  assert.ok(seen.every((s) => !s.auth), 'no admin credential in password mode');
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);
  assert.ok(password.length >= 8);
  assert.equal(ssoLogin.derivePassword('s3cret', ' Maria@Example.com '), password, 'same password for the same e-mail');
  assert.notEqual(ssoLogin.derivePassword('other', 'maria@example.com'), password);
});

test('password mode: returning customer (already exists) signs in', async () => {
  global.fetch = async (input, init = {}) => {
    if (String(input).endsWith('/jwks.json')) return json({ keys: [JWK] });
    const { query } = JSON.parse(init.body);
    if (query.includes('createCustomerV2')) {
      return json({ errors: [{ message: 'A customer with the same email address already exists in an associated website.' }] });
    }
    return json({ data: { generateCustomerToken: { token: 'pw-token-2' } } });
  };
  const res = await ssoLogin.main({
    ...PARAMS, SSO_COMMERCE_MODE: 'password', SSO_PASSWORD_SECRET: 's3cret', idToken: idToken(),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, 'pw-token-2');
});

test('password mode: account created before SSO (own password) -> 409', async () => {
  global.fetch = async (input, init = {}) => {
    if (String(input).endsWith('/jwks.json')) return json({ keys: [JWK] });
    const { query } = JSON.parse(init.body);
    if (query.includes('createCustomerV2')) return json({ errors: [{ message: 'A customer with the same email address already exists.' }] });
    return json({
      errors: [{
        message: 'The account sign-in was incorrect or your account is disabled temporarily. Please wait and try again later.',
        extensions: { category: 'graphql-authentication' },
      }],
    });
  };
  const res = await ssoLogin.main({
    ...PARAMS, SSO_COMMERCE_MODE: 'password', SSO_PASSWORD_SECRET: 's3cret', idToken: idToken(),
  });
  assert.equal(res.statusCode, 409);
});

test('mode selection: explicit SSO_COMMERCE_MODE wins; secret alone means password', () => {
  assert.equal(ssoLogin.getMode({ IMS_CLIENT_ID: 'x' }), 'exchange');
  assert.equal(ssoLogin.getMode({ SSO_PASSWORD_SECRET: 'x', IMS_CLIENT_ID: 'x' }), 'password');
  assert.equal(ssoLogin.getMode({ SSO_COMMERCE_MODE: 'exchange', SSO_PASSWORD_SECRET: 'x' }), 'exchange');
});
