#!/usr/bin/env node
/* eslint-disable no-console */
/*
 * Deploys the actions straight to Adobe I/O Runtime (OpenWhisk REST API) — for Developer
 * Console projects with "Runtime functions" only, where `aio app deploy` is not available.
 *   npm run deploy                 deploy (package params from .env, actions bundled to dist/)
 *   npm run deploy -- --dry-run    only bundle and show what would be deployed
 * Runtime credentials: workspace.json in this folder (Developer Console > workspace >
 * Download all) or AIO_runtime_namespace / AIO_runtime_auth in .env. Secrets are never printed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PACKAGE = 'sebrae-alm';
const KIND = 'nodejs:20';
const API = 'https://adobeioruntime.net/api/v1';

// package parameters (from .env): shared by both actions
const PACKAGE_PARAMS = [
  'ALM_BASE_URL', 'ALM_CLIENT_ID', 'ALM_CLIENT_SECRET', 'ALM_REFRESH_TOKEN', 'ALM_EXTERNAL_PROFILE_ID',
  'ALM_COURSE_ATTRIBUTE', 'ALM_LOCALE', 'ALM_ACCOUNT_ID', 'COMMERCE_GRAPHQL_URL', 'COMMERCE_WEBSITE_CODE', 'COMMERCE_STORE_CODE',
  'COMMERCE_STORE_VIEW_CODE',
];
const ACTIONS = {
  enroll: { web: false, timeout: 60000 },
  'my-courses': { web: true, timeout: 30000 },
};

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) throw new Error('.env not found (copy .env.example)');
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }));
}

/** Runtime namespace + auth ("uuid:key") from workspace.json or .env. */
function getRuntime(env) {
  const file = path.join(ROOT, 'workspace.json');
  if (fs.existsSync(file)) {
    const ws = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ns = ws.project?.workspace?.details?.runtime?.namespaces?.[0];
    if (ns?.name && ns?.auth) return { namespace: ns.name, auth: ns.auth, source: 'workspace.json' };
  }
  if (env.AIO_runtime_namespace && env.AIO_runtime_auth) {
    return { namespace: env.AIO_runtime_namespace, auth: env.AIO_runtime_auth, source: '.env' };
  }
  throw new Error('Runtime credentials not found: save the Developer Console workspace JSON as workspace.json '
    + 'in this folder (Download all) or set AIO_runtime_namespace and AIO_runtime_auth in .env');
}

/**
 * Single-file action: the action module plus the shared modules it requires, behind a
 * small require shim (no build tools needed).
 */
function bundle(name) {
  const read = (file) => fs.readFileSync(path.join(ROOT, 'actions', file), 'utf8');
  const shared = ['alm.js', 'commerce.js'];
  const wrap = (id, source) => `  ${JSON.stringify(id)}: function (module, exports, require) {\n${source
    .replace(/require\('\.\.\/(alm|commerce)\.js'\)/g, (m, lib) => `require('${lib}.js')`)}\n  },`;
  return `/* ${PACKAGE}/${name} — bundled by scripts/deploy-runtime.js, do not edit */
const __sources = {
${shared.map((file) => wrap(file, read(file))).join('\n')}
${wrap('action', read(`${name}/index.js`))}
};
const __cache = {};
function __require(id) {
  if (!__cache[id]) {
    if (!__sources[id]) return require(id);
    const module = { exports: {} };
    __cache[id] = module;
    __sources[id](module, module.exports, __require);
  }
  return __cache[id].exports;
}
function main(params) {
  return __require('action').main(params);
}
exports.main = main;
`;
}

async function request(runtime, method, url, body) {
  const resp = await fetch(`${API}/namespaces/${encodeURIComponent(runtime.namespace)}${url}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(runtime.auth).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body && JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${method} ${url} -> ${resp.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = loadEnv();
  const missing = ['ALM_CLIENT_ID', 'ALM_CLIENT_SECRET', 'ALM_REFRESH_TOKEN', 'COMMERCE_GRAPHQL_URL'].filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing in .env: ${missing.join(', ')}`);

  // bundle
  const dist = path.join(ROOT, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  const code = Object.fromEntries(Object.keys(ACTIONS).map((name) => {
    const source = bundle(name);
    fs.writeFileSync(path.join(dist, `${name}.js`), source);
    return [name, source];
  }));
  console.log(`OK    actions bundled in dist/ (${Object.keys(code).join(', ')})`);

  const params = PACKAGE_PARAMS.filter((key) => env[key]).map((key) => ({ key, value: env[key] }));
  console.log(`OK    package parameters from .env: ${params.map((p) => p.key).join(', ')}`);

  if (dryRun) {
    console.log('dry run: nothing deployed');
    return;
  }

  const runtime = getRuntime(env);
  console.log(`OK    Runtime namespace ${runtime.namespace} (credentials from ${runtime.source})`);

  await request(runtime, 'PUT', `/packages/${PACKAGE}?overwrite=true`, {
    publish: false,
    parameters: params,
  });
  console.log(`OK    package ${PACKAGE}`);

  // eslint-disable-next-line no-restricted-syntax
  for (const [name, options] of Object.entries(ACTIONS)) {
    const annotations = [
      { key: 'web-export', value: options.web },
      { key: 'raw-http', value: false },
      { key: 'final', value: true },
      { key: 'require-adobe-auth', value: false },
    ];
    // eslint-disable-next-line no-await-in-loop
    await request(runtime, 'PUT', `/actions/${PACKAGE}/${name}?overwrite=true`, {
      exec: { kind: KIND, code: code[name] },
      annotations,
      limits: { timeout: options.timeout, memory: 256 },
    });
    console.log(`OK    action ${PACKAGE}/${name}${options.web ? ' (web)' : ''}`);
  }

  console.log('\nURL da ação my-courses (vai em alm-my-courses-url no config.json do site):');
  console.log(`  https://${runtime.namespace}.adobeioruntime.net/api/v1/web/${PACKAGE}/my-courses`);
  console.log(`\nAção para ligar ao evento do Commerce no Developer Console: ${PACKAGE}/enroll`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`FALHA ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  PACKAGE, loadEnv, getRuntime, request,
};
