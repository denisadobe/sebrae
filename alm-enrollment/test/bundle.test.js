/* Every action bundles into a single file that loads and runs (shared modules resolved). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ACTIONS, bundle } = require('../scripts/deploy-runtime.js');

test('bundled actions load without missing modules', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alm-bundle-'));
  // eslint-disable-next-line no-restricted-syntax
  for (const name of Object.keys(ACTIONS)) {
    const file = path.join(dir, `${name}.js`);
    fs.writeFileSync(file, bundle(name));
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const action = require(file);
    assert.equal(typeof action.main, 'function', name);
    // eslint-disable-next-line no-await-in-loop
    const res = await action.main({ __ow_headers: {} });
    assert.ok(res.statusCode >= 400, `${name} rejects an empty request`);
  }
});
