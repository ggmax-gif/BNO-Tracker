// Copies index.html into dist/ for bundling, and guards the one thing that
// caused real confusion: two bundles claiming the same version with no way to
// tell them apart. index.html owns the version; this refuses to build if
// tauri.conf.json disagrees, so the bundle can never claim a version the UI
// does not show. The build stamp is injected into the COPY only, so the source
// file stays a no-build-step static page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = new URL('../../index.html', import.meta.url);
const CONF = new URL('../src-tauri/tauri.conf.json', import.meta.url);
const PKG = new URL('../package.json', import.meta.url);
const CARGO = new URL('../src-tauri/Cargo.toml', import.meta.url);
const OUT = new URL('../dist/index.html', import.meta.url);

const html = readFileSync(SRC, 'utf8');

const m = html.match(/const APP_VERSION = '([^']+)';/);
if (!m) {
  console.error('sync: no APP_VERSION found in index.html — refusing to build.');
  process.exit(1);
}
const version = m[1];

// Four files carry a version and only tauri.conf.json reaches the bundle, so
// checking one of them is how the other three drift. index.html is the source of
// truth; every other declaration must agree or the build stops.
const others = [
  ['tauri.conf.json', JSON.parse(readFileSync(CONF, 'utf8')).version],
  ['package.json', JSON.parse(readFileSync(PKG, 'utf8')).version],
  ['Cargo.toml', (readFileSync(CARGO, 'utf8').match(/^version = "([^"]+)"/m) || [])[1]],
];
const drifted = others.filter(([, v]) => v !== version);
if (drifted.length) {
  console.error(`sync: version mismatch — index.html says ${version}, but:`);
  for (const [file, v] of drifted) console.error(`  ${file} says ${v ?? '(not found)'}`);
  console.error('sync: bring them all to the same version, or the bundle will report');
  console.error('sync: a version the footer does not show.');
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(OUT, html.replace('__BUILD_STAMP__', stamp));
console.log(`sync: v${version}  build ${stamp}`);
