#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Calls the deployed enroll action directly with a fake order — tests the ALM side
 * (user + enrollment) without the Commerce event. No secrets printed.
 *   npm run enroll-test -- <customer e-mail> <product SKU> [first name] [last name]
 */
const {
  PACKAGE, loadEnv, getRuntime, request,
} = require('./deploy-runtime.js');

async function main() {
  const [email, sku, firstname = 'Teste', lastname = 'Sebrae'] = process.argv.slice(2);
  if (!email || !sku) throw new Error('uso: npm run enroll-test -- <e-mail> <SKU> [nome] [sobrenome]');
  const runtime = getRuntime(loadEnv());
  const result = await request(runtime, 'POST', `/actions/${PACKAGE}/enroll?blocking=true&result=true`, {
    order: {
      increment_id: `teste-${Date.now()}`,
      customer_email: email,
      customer_firstname: firstname,
      customer_lastname: lastname,
      items: [{ sku }],
    },
  });
  console.log(JSON.stringify(result.body ?? result, null, 2));
}

main().catch((error) => {
  console.error(`FALHA ${error.message}`);
  process.exit(1);
});
