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
  const max = Math.min(Number(limit) || 5, 50);
  let list = await request(runtime, 'GET', `/activations?name=${PACKAGE}/${action}&limit=${max}&docs=true`);
  if (!list.length) {
    // the name filter does not match packaged actions everywhere: filter recent activations by path
    const path = `${PACKAGE}/${action}`;
    const matches = (a) => a.name === action
      && (a.annotations || []).some((n) => n.key === 'path' && String(n.value).endsWith(path));
    list = [];
    // the API returns at most 50 activations per call: look through the last 200
    for (let skip = 0; skip < 200 && list.length < max; skip += 50) {
      // eslint-disable-next-line no-await-in-loop
      const page = await request(runtime, 'GET', `/activations?limit=50&skip=${skip}&docs=true`);
      list.push(...page.filter(matches));
      if (page.length < 50) break;
    }
    list = list.slice(0, max);
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
