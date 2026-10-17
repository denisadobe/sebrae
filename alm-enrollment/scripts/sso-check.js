#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Checks the Commerce side of single sign-on: IMS server-to-server token + the
 * exchangeExternalCustomerToken mutation (creates the customer if it does not exist).
 * No tokens printed.
 *   npm run sso-check -- <e-mail> [first name] [last name]
 */
const fs = require('fs');
const path = require('path');
const sso = require('../actions/sso.js');
const commerce = require('../actions/commerce.js');
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
  if (!params.IMS_CLIENT_ID || !params.IMS_CLIENT_SECRET) {
    throw new Error('credencial OAuth Server-to-Server não encontrada (workspace.json ou IMS_CLIENT_ID/IMS_CLIENT_SECRET no .env)');
  }

  await sso.getImsToken(params);
  console.log('OK    IMS: token server-to-server (escopo commerce.accs)');

  const data = await commerce.graphql(params, `mutation ($customer: CustomerCreateInput!) {
    exchangeExternalCustomerToken(input: { customer: $customer }) { token customer { email firstname lastname } }
  }`, { customer: { email, firstname, lastname } }, await sso.commerceAdminHeaders(params));
  const result = data.exchangeExternalCustomerToken;
  if (!result?.token) throw new Error('Commerce não devolveu token');
  console.log(`OK    Commerce: login externo para ${result.customer.email} (${result.customer.firstname} ${result.customer.lastname})`);
}

main().catch((error) => {
  console.error(`FALHA ${error.message}${error.errors ? ` ${JSON.stringify(error.errors).slice(0, 300)}` : ''}`);
  process.exit(1);
});
