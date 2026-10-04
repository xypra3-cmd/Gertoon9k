// STORE-01: the mobile app must not contain prices, payment providers or links to web billing
// (App Store 3.1.1 / Google Play payments policy).
//
// 1. Scans our own mobile source (app/, lib/, components/, locales/, app.config.ts).
// 2. If an export exists (npm --prefix mobile run export:android), reads its source map to get the
//    exact list of first-party modules that ship in the bundle (incl. packages/shared) and scans those
//    too, and asserts that the web-only pricing module (packages/shared/src/plans.ts) is not bundled.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../mobile');
const BANNED = [/₮/, /\\u20ae/i, /QPay/i, /\/billing/i, /Pro-д шилжих/, /Upgrade to Pro/i, /\bMNT\b/, /price_mnt|price_per_seat/];

const files = new Set();
const walk = (p) => {
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((f) => walk(path.join(p, f)));
  else if (/\.(tsx?|jsx?|json)$/.test(p)) files.add(path.resolve(p));
};
['app', 'lib', 'components', 'locales', 'app.config.ts'].forEach((t) => walk(path.join(mobile, t)));

let bundledModules = 0;
const failures = [];
const exportDir = path.join(mobile, 'dist-android');
if (fs.existsSync(exportDir)) {
  const maps = [];
  const findMaps = (p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).forEach((f) => findMaps(path.join(p, f))) : p.endsWith('.map') && maps.push(p));
  findMaps(exportDir);
  for (const m of maps) {
    const { sources } = JSON.parse(fs.readFileSync(m, 'utf8'));
    for (const s of sources) {
      if (!s.startsWith('/') || s.includes('node_modules')) continue; // polyfills / third-party
      const resolved = path.join(mobile, s.split('?')[0]); // sources are relative to the mobile root
      bundledModules++;
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) files.add(path.resolve(resolved));
      if (/packages[\\/]shared[\\/]src[\\/]plans\.ts$/.test(resolved)) failures.push(`pricing module is bundled: ${s}`);
    }
  }
}

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const re of BANNED) {
    const m = text.match(re);
    if (m) failures.push(`${path.relative(path.dirname(mobile), f)}: "${m[0]}"`);
  }
}

console.log(`STORE-01 scanned ${files.size} first-party files` + (bundledModules ? ` (${bundledModules} bundled modules from the export source map)` : ' (source only — run `npm --prefix mobile run export:android` to include the bundle)'));
if (failures.length) {
  console.error('FAIL\n' + failures.join('\n'));
  process.exit(1);
}
console.log('PASS — no prices, payment providers or billing links');
