// Differential test: random families through both the real engine and the
// brute-force oracle. Seeded, so a failure is reproducible from the seed alone.
const E = require('./extract-engine.cjs')();
const oracle = require('./oracle.cjs')(E);
const { calcRollingWindow, toDateStr, addDays } = E;
const today = new Date(); today.setHours(0,0,0,0);

let seed = Number(process.env.FUZZ_SEED || 20260903);
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const ri = n => Math.floor(rnd() * n);
const N = Number(process.env.FUZZ_N || 400);

let bad = 0;
for (let k = 0; k < N; k++) {
  const off = 400 + ri(600);
  const grant = toDateStr(addDays(today, -off));
  const trips = [];
  for (let j = 0; j < ri(7); j++) {
    const dep = addDays(grant, ri(off + 40) - 20);   // some deliberately precede the grant
    const ongoing = rnd() < 0.12;                     // and some have no return date
    trips.push({ id:'t'+j, memberId:'m', departureDate: toDateStr(dep),
                 returnDate: ongoing ? '' : toDateStr(addDays(dep, ri(200))) });
  }
  const c = calcRollingWindow({ id:'m', bnoGrantDate: grant }, trips);
  const o = oracle(grant, trips, today);
  if (c.worstWindow !== o.worst || c.daysAbsentInWindow !== o.current || c.totalAbsent !== o.total) {
    bad++;
    if (bad <= 2) console.log('MISMATCH', JSON.stringify({ grant, trips,
      got:{w:c.worstWindow,cur:c.daysAbsentInWindow,tot:c.totalAbsent}, want:o }));
  }
}
console.log(`Differential fuzz: ${N-bad}/${N} exact matches on worstWindow, current window and totalAbsent (seed ${process.env.FUZZ_SEED || 20260903})`);
process.exit(bad ? 1 : 0);
