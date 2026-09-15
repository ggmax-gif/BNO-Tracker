const E = require('./extract-engine.cjs')();
const oracle = require('./oracle.cjs')(E);
const { calcRollingWindow, tripAbsenceDays, parseDate, addDays, toDateStr } = E;
const today = new Date(); today.setHours(0,0,0,0);
let pass = 0, fail = 0;
const check = (n, c, d='') => { c ? (pass++, console.log('  PASS', n, d)) : (fail++, console.log('  FAIL', n, d)); };
const g = parseDate('2021-01-01');

console.log('A. Midnight rule — departure counts, return does not');
const md = (a,b) => tripAbsenceDays({departureDate:a, returnDate:b}, today);
check('7 Dec -> 4 Feb is 59 not 60', md('2025-12-07','2026-02-04') === 59);
check('same-day round trip is 0',    md('2026-05-04','2026-05-04') === 0);
check('Mon -> next Mon is 7',        md('2026-05-04','2026-05-11') === 7);

console.log('\nB. Two 170-day trips 7 months apart breach a 12-month window');
const tB = [{id:'t1',memberId:'m',departureDate:'2025-09-10',returnDate:'2026-02-27'},
            {id:'t2',memberId:'m',departureDate:'2026-03-10',returnDate:'2026-08-27'}];
const cB = calcRollingWindow({id:'m',bnoGrantDate:'2021-01-01'}, tB), oB = oracle('2021-01-01', tB, today);
check('current window matches oracle', cB.daysAbsentInWindow === oB.current, `${cB.daysAbsentInWindow}`);
check('worst window matches oracle',   cB.worstWindow === oB.worst, `${cB.worstWindow}`);
check('not compliant', cB.isCompliant === false);
check('not ILR eligible', cB.isEligible === false);

console.log('\nC. A breach straddling a fixed-block boundary is still seen');
const tC = [{id:'a',memberId:'m',departureDate:toDateStr(addDays(g,5)),  returnDate:toDateStr(addDays(g,180))},
            {id:'b',memberId:'m',departureDate:toDateStr(addDays(g,180)),returnDate:toDateStr(addDays(g,355))}];
const cC = calcRollingWindow({id:'m',bnoGrantDate:'2021-01-01'}, tC), oC = oracle('2021-01-01', tC, today);
check('worst window matches oracle', cC.worstWindow === oC.worst, `${cC.worstWindow}`);
check('not ILR eligible', cC.isEligible === false);

console.log('\nD. Duplicate overlapping trips count each day once');
const cD = calcRollingWindow({id:'m',bnoGrantDate:'2021-01-01'},
  [{id:'a',memberId:'m',departureDate:'2026-01-05',returnDate:'2026-02-05'},
   {id:'b',memberId:'m',departureDate:'2026-01-05',returnDate:'2026-02-05'}]);
check('31 not 62', cD.totalAbsent === 31, `totalAbsent=${cD.totalAbsent}`);

console.log('\nE. A compliant family is not falsely flagged');
const tE = []; for (let y=0;y<5;y++) tE.push({id:'h'+y,memberId:'m',departureDate:toDateStr(addDays(g,y*365+10)),returnDate:toDateStr(addDays(g,y*365+70))});
const cE = calcRollingWindow({id:'m',bnoGrantDate:'2021-01-01'}, tE), oE = oracle('2021-01-01', tE, today);
check('worst window matches oracle', cE.worstWindow === oE.worst, `${cE.worstWindow}`);
check('compliant', cE.isCompliant === true);
check('ILR eligible', cE.isEligible === true);

console.log('\nF. The 180 boundary is where it is meant to be');
const mk = n => calcRollingWindow({id:'m',bnoGrantDate:'2021-01-01'},
  [{id:'z',memberId:'m',departureDate:toDateStr(addDays(g,10)),returnDate:toDateStr(addDays(g,10+n))}]);
check('179 days compliant',     mk(179).isCompliant === true);
check('180 days not compliant', mk(180).isCompliant === false);

console.log('\nG. Degenerate input degrades instead of throwing');
try { const c = calcRollingWindow({id:'x'}, []); check('missing grant date', true, `worst=${c.worstWindow}`); }
catch (e) { check('missing grant date', false, e.message); }
try { const c = calcRollingWindow({id:'y',bnoGrantDate:'2030-01-01'}, []); check('grant date in the future', true, `worst=${c.worstWindow}`); }
catch (e) { check('grant date in the future', false, e.message); }

console.log('\nH. The planner evaluates a future trip at its end');
const dep = toDateStr(addDays(today,30)), ret = toDateStr(addDays(today,230));
const cH = calcRollingWindow({id:'k',bnoGrantDate:'2021-01-01'}, [{id:'k',memberId:'k',departureDate:dep,returnDate:ret}], ret);
check('200-day trip reads red', cH.status === 'red', `window=${cH.daysAbsentInWindow}`);
check('history is not rewritten by a plan', cH.isCompliant === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
