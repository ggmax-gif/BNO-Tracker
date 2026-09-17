// Guards against regressions that are invisible at runtime until a user clicks.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let fail = 0;
const check = (name, ok, detail='') => { ok ? console.log('  PASS', name, detail) : (fail++, console.log('  FAIL', name, detail)); };

// Inline handlers are inert under a nonce CSP. The packaged app shipped four
// releases with every button dead because of this, and nothing at runtime said so.
const inline = html.match(/\son(click|change|submit|input|keyup)\s*=/g) || [];
check('no inline event handlers', inline.length === 0, inline.length ? `found ${inline.length}` : '');

// Every data-act must resolve to something in the ACTIONS map, or the button
// is silently dead in exactly the same way.
const acts = [...html.matchAll(/data-act(?:-change)?="([^"]+)"/g)].map(m => m[1]);
const mapBlock = (html.match(/const ACTIONS = \{([\s\S]*?)\};/) || [,''])[1];
const mapped = new Set(mapBlock.split(/[,\s]+/).filter(Boolean));
const missing = [...new Set(acts)].filter(a => !mapped.has(a));
check('every data-act is in ACTIONS', missing.length === 0, missing.length ? `missing: ${missing}` : `${new Set(acts).size} actions`);

// The privacy promise is enforced, not just stated.
check('no external script tags', !/<script[^>]+src="https?:/.test(html));
check('CSP meta tag present', /http-equiv="Content-Security-Policy"/.test(html));

// The rules date must be a real date or empty; never a placeholder.
const rc = (html.match(/const RULES_CHECKED = '([^']*)'/) || [])[1];
check('RULES_CHECKED is a date or empty', rc === '' || /^\d{4}-\d{2}-\d{2}$/.test(rc), `"${rc}"`);

process.exit(fail ? 1 : 0);
