// Copies the installed @dropins/* packages (listed in package.json dependencies) into
// scripts/__dropins__ so they can be served as-is (Edge Delivery has no build step).
// Run with `npm run install:dropins` after changing drop-in versions.
const fs = require('fs');
const path = require('path');

const { dependencies = {} } = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const target = path.join('scripts', '__dropins__');

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

Object.keys(dependencies)
  .filter((name) => name.startsWith('@dropins/'))
  .forEach((name) => {
    const dir = name.replace('@dropins/', '');
    fs.cpSync(path.join('node_modules', name), path.join(target, dir), {
      recursive: true,
      filter: (src) => !src.endsWith('package.json') && !src.endsWith('.map'),
    });
    // eslint-disable-next-line no-console
    console.log(`vendored ${name}`);
  });
