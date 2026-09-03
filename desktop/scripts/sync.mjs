// Copies index.html into dist/ for bundling, and guards the one thing that
// caused real confusion: two bundles claiming the same version with no way to
// tell them apart. index.html owns the version; this refuses to build if
// tauri.conf.json disagrees, so the bundle can never claim a version the UI
// does not show. The build stamp is injected into the COPY only, so the source
// file stays a no-build-step static page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = new URL('../../index.html', import.meta.url);
const CONF = new URL('../src-tauri/tauri.conf.json', import.meta.url);
const OUT = new URL('../dist/index.html', import.meta.url);

const html = readFileSync(SRC, 'utf8');

const m = html.match(/const APP_VERSION = '([^']+)';/);
if (!m) {
  console.error('sync: no APP_VERSION found in index.html — refusing to build.');
  process.exit(1);
}
const version = m[1];

const conf = JSON.parse(readFileSync(CONF, 'utf8'));
if (conf.version !== version) {
  console.error(`sync: version mismatch — index.html says ${version}, tauri.conf.json says ${conf.version}.`);
  console.error('sync: bump both, or the bundle will report a version the footer does not show.');
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(OUT, html.replace('__BUILD_STAMP__', stamp));
console.log(`sync: v${version}  build ${stamp}`);
