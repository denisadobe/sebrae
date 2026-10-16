#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Gets the ALM refresh token of the integration (OAuth authorization code flow) and saves it
 * in .env (ALM_REFRESH_TOKEN) without printing it.
 *   npm run refresh-token
 * Needs ALM_CLIENT_ID, ALM_CLIENT_SECRET and ALM_REDIRECT_URI (a URL of the application's
 * Redirect Domains) in .env. Sign in as an ALM administrator when the browser opens.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV = path.join(__dirname, '..', '.env');
const SCOPES = 'admin:read,admin:write,learner:read,learner:write';

function readEnv() {
  if (!fs.existsSync(ENV)) throw new Error('.env not found (copy .env.example)');
  return fs.readFileSync(ENV, 'utf8');
}

const value = (env, key) => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');

function writeValue(env, key, val) {
  const line = `${key}=${val}`;
  return new RegExp(`^${key}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${key}=.*$`, 'm'), line) : `${env.trimEnd()}\n${line}\n`;
}

async function main() {
  const env = readEnv();
  const base = (value(env, 'ALM_BASE_URL') || 'https://learningmanager.adobe.com').replace(/\/$/, '');
  const clientId = value(env, 'ALM_CLIENT_ID');
  const clientSecret = value(env, 'ALM_CLIENT_SECRET');
  const redirectUri = value(env, 'ALM_REDIRECT_URI');
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('fill ALM_CLIENT_ID, ALM_CLIENT_SECRET and ALM_REDIRECT_URI in .env first');
  }

  const authorize = new URL(`${base}/oauth/o/authorize`);
  authorize.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, state: 'sebrae', scope: SCOPES, response_type: 'CODE',
  });
  console.log('\n1. Abra este endereço no navegador e entre como administrador do ALM:\n');
  console.log(`   ${authorize.href}\n`);
  console.log('2. Depois de autorizar, o navegador vai para o site com ?code=... na barra de endereço.');
  console.log('   Copie o endereço inteiro e cole aqui (ele vale só alguns minutos).\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => { rl.question('Endereço com o code: ', resolve); });
  rl.close();
  const code = answer.includes('code=') ? new URL(answer.trim()).searchParams.get('code') : answer.trim();
  if (!code) throw new Error('code not found in the address');

  const resp = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.refresh_token) {
    throw new Error(`token exchange failed (${resp.status}): ${body.error || body.title || JSON.stringify(body).slice(0, 200)}`);
  }
  fs.writeFileSync(ENV, writeValue(readEnv(), 'ALM_REFRESH_TOKEN', body.refresh_token));
  console.log('\nOK — refresh token salvo em .env (ALM_REFRESH_TOKEN). Agora rode: npm run check');
}

main().catch((error) => {
  console.error(`\nFALHA — ${error.message}`);
  process.exit(1);
});
