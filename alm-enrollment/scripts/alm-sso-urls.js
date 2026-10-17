#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Prints the URLs of the "silent ALM login" test (SSO identity provider -> ALM -> OAuth code).
 * Uses only public values of .env (ALM client id, redirect URI, IdP login URL). No secrets.
 *   npm run alm-sso-urls
 */
const { loadEnv } = require('./deploy-runtime.js');

const env = loadEnv();
const base = (env.ALM_BASE_URL || 'https://learningmanager.adobe.com').replace(/\/$/, '');
const idp = env.ALM_SSO_IDP_URL || 'https://dev-533cjwwlbzw8n64k.us.auth0.com/samlp/NPZeU4D05RRdDS5nW0g5Drq9T4PkzNQd';
if (!env.ALM_CLIENT_ID || !env.ALM_REDIRECT_URI) {
  console.error('FALHA preencha ALM_CLIENT_ID e ALM_REDIRECT_URI no .env');
  process.exit(1);
}

const authorize = new URL(`${base}/oauth/o/authorize`);
authorize.search = new URLSearchParams({
  client_id: env.ALM_CLIENT_ID,
  redirect_uri: env.ALM_REDIRECT_URI,
  state: 'teste-sso',
  scope: 'learner:read,learner:write',
  response_type: 'CODE',
});
const chained = new URL(idp);
chained.searchParams.set('RelayState', authorize.href);

console.log('\nTeste A (login do ALM + autorização encadeados) — abra na mesma janela em que entrou no site:\n');
console.log(`  ${chained.href}\n`);
console.log('Teste B (só a autorização, depois de já ter entrado no ALM):\n');
console.log(`  ${authorize.href}\n`);
console.log('Resultado esperado: o navegador termina em');
console.log(`  ${env.ALM_REDIRECT_URI}?code=...&state=teste-sso`);
console.log('sem pedir senha nem clique. Anote onde cada teste terminou (não precisa mandar o code).\n');
