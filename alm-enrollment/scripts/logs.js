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
  const max = Number(limit);
  let list = await request(runtime, 'GET', `/activations?name=${PACKAGE}/${action}&limit=${max}&docs=true`);
  if (!list.length) {
    // the name filter does not match packaged actions everywhere: filter recent activations by path
    const path = `${PACKAGE}/${action}`;
    list = (await request(runtime, 'GET', '/activations?limit=200&docs=true'))
      .filter((a) => a.name === action
        && (a.annotations || []).some((n) => n.key === 'path' && String(n.value).endsWith(path)))
      .slice(0, max);
  }
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
