#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Last runs of the actions (Runtime activations): result and logs, no secrets.
 *   npm run logs              last 5 runs of enroll
 *   npm run logs -- my-courses 10
 */
const {
  PACKAGE, loadEnv, getRuntime, request,
} = require('./deploy-runtime.js');

async function main() {
  const [action = 'enroll', limit = '5'] = process.argv.slice(2);
  const runtime = getRuntime(loadEnv());
  const list = await request(runtime, 'GET', `/activations?name=${PACKAGE}/${action}&limit=${Number(limit)}&docs=true`);
  if (!list.length) {
    console.log(`Nenhuma execução de ${PACKAGE}/${action} ainda.`);
    return;
  }
  list.forEach((activation) => {
    const { response = {}, logs = [] } = activation;
    console.log(`\n=== ${new Date(activation.start).toLocaleString('pt-BR')} — ${response.success ? 'ok' : 'erro'} (${activation.duration} ms)`);
    console.log(JSON.stringify(response.result?.body ?? response.result, null, 2));
    logs.forEach((line) => console.log(`  ${line}`));
  });
}

main().catch((error) => {
  console.error(`FALHA ${error.message}`);
  process.exit(1);
});
