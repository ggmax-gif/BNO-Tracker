// Pulls the calculation engine out of index.html so it can be tested headlessly.
// The app is one file with no build step and no module system, so there is
// nothing to import — this lifts the date/window functions verbatim and wraps
// them as a CommonJS module. Verbatim matters: a re-implementation here would
// test the copy, not the code that ships.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const START = '\nfunction parseDate(';
const END = '\n// ============ TAB NAVIGATION';
const a = html.indexOf(START), b = html.indexOf(END);
if (a === -1 || b === -1) {
  console.error('extract-engine: markers not found in index.html — did the section headers change?');
  process.exit(1);
}
const body = html.slice(a + 1, b);
const out = [
  'function t(){ return "Still away"; }   // i18n stub: the engine only uses t() for a label',
  body,
  'module.exports = { parseDate, toDateStr, daysBetween, addDays, addYears,',
  '  tripAbsenceRange, tripAbsenceDays, calcRollingWindow, buildAbsenceTimeline,',
  '  absentInRange, WINDOW_DAYS, MAX_ABSENCE };',
].join('\n');
fs.writeFileSync(path.join(__dirname, '.engine.cjs'), out);
module.exports = () => require('./.engine.cjs');
if (require.main === module) console.log('extracted', body.split('\n').length, 'lines');
