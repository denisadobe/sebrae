#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Checks the Commerce side of single sign-on with the .env settings (SSO_COMMERCE_MODE):
 * opens a Commerce session for the e-mail, creating the customer if it does not exist.
 * Same code as the sso-login action; no tokens printed.
 *   npm run sso-check -- <e-mail> [first name] [last name]
 */
const fs = require('fs');
const path = require('path');
const sso = require('../actions/sso.js');
const { getCustomerToken, getMode } = require('../actions/sso-login/index.js');
const { loadEnv } = require('./deploy-runtime.js');

function imsFromWorkspace() {
  const file = path.join(__dirname, '..', 'workspace.json');
  if (!fs.existsSync(file)) return {};
  const ws = JSON.parse(fs.readFileSync(file, 'utf8'));
  const s2s = (ws.project?.workspace?.details?.credentials || []).map((c) => c.oauth_server_to_server).find(Boolean);
  return {
    ...(s2s?.client_id && { IMS_CLIENT_ID: s2s.client_id }),
    ...(s2s?.client_secrets?.[0] && { IMS_CLIENT_SECRET: s2s.client_secrets[0] }),
    ...(ws.project?.org?.ims_org_id && { IMS_ORG_ID: ws.project.org.ims_org_id }),
  };
}

async function main() {
  const [email, firstname = 'Teste', lastname = 'Sebrae'] = process.argv.slice(2);
  if (!email) throw new Error('uso: npm run sso-check -- <e-mail> [nome] [sobrenome]');
  const params = { ...imsFromWorkspace(), ...Object.fromEntries(Object.entries(loadEnv()).filter(([, v]) => v)) };
  const mode = getMode(params);
  console.log(`OK    modo ${mode}`);

  if (mode === 'exchange') {
    if (!params.IMS_CLIENT_ID || !params.IMS_CLIENT_SECRET) {
      throw new Error('credencial OAuth Server-to-Server não encontrada (workspace.json ou IMS_CLIENT_ID/IMS_CLIENT_SECRET no .env)');
    }
    await sso.getImsToken(params);
    console.log('OK    IMS: token server-to-server (escopo commerce.accs)');
  } else if (!params.SSO_PASSWORD_SECRET) {
    throw new Error('SSO_PASSWORD_SECRET vazio: rode `npm run deploy` uma vez (ele gera a chave) ou preencha no .env');
  }

  const { customer } = await getCustomerToken(params, { email, firstname, lastname });
  console.log(`OK    Commerce: sessão aberta para ${customer.email} (${customer.firstname} ${customer.lastname})`);
}

main().catch((error) => {
  const detail = error.status === 409
    ? ' — esse e-mail já tem conta na loja com senha própria; teste com um e-mail novo'
    : '';
  console.error(`FALHA ${error.message}${detail}${error.errors ? ` ${JSON.stringify(error.errors).slice(0, 300)}` : ''}`);
  process.exit(1);
});
