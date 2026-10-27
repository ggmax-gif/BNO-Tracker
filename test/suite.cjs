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

console.log('\nI. Citizenship: gov.uk worked example (away 10-25 June 2017)');
const oracleBC = require('./oracle-bc.cjs');
const { calcCitizenship, bcTestsOn, buildAbsenceTimeline: bt, yearsBefore, addYears } = E;
const TS = toDateStr(today);
{
  const gI = parseDate('2016-01-01');
  const tl = bt(gI, [{departureDate:'2017-06-10', returnDate:'2017-06-25'}], parseDate('2023-01-01'), parseDate('2023-01-01'));
  check('20 June 2022 does not qualify', bcTestsOn(tl, gI, parseDate('2022-06-20')).ok === false);
  check('23 June 2022 does not qualify', bcTestsOn(tl, gI, parseDate('2022-06-23')).ok === false);
  check('24 June 2022 qualifies',        bcTestsOn(tl, gI, parseDate('2022-06-24')).ok === true);
}
check('29 Feb back 5 years is 28 Feb', toDateStr(yearsBefore('2032-02-29', 5)) === '2027-02-28');
check('29 Feb back 4 years is 29 Feb', toDateStr(yearsBefore('2032-02-29', 4)) === '2028-02-29');

console.log('\nJ. Citizenship: ILR timing');
const yrs = n => toDateStr(addDays(today, -Math.round(n * 365.25)));
const mBC = (o) => ({ id:'c', bnoGrantDate: yrs(8), goal:'bc', ...o });
const bcEq = (name, m, tr) => { const c = calcCitizenship(m, tr), o = oracleBC(m, tr, TS);
  check(name + ' matches oracle', (c.earliestStr || null) === o.earliest, `${c.earliestStr} vs ${o.earliest}`); return c; };
let c;
c = bcEq('no trips, ILR 2 years ago', mBC({ ilrGrantDate: yrs(2) }), []);
check('eligible now', c.eligibleNow === true && c.earliestStr === TS);
c = bcEq('ILR 6 months ago', mBC({ ilrGrantDate: yrs(0.5) }), []);
check('waits for 12 months of ILR', c.eligibleNow === false && c.earliestStr === toDateStr(addYears(yrs(0.5), 1)));
c = bcEq('ILR not granted yet', mBC({ bnoGrantDate: yrs(4) }), []);
check('projection only, never eligible now', c.eligibleNow === false && c.ilrHeld === false && c.earliestStr === toDateStr(addYears(yrs(4), 6)));

console.log('\nK. Citizenship: the 90 and 450 limits are "not more than"');
const away = (id, from, n) => ({ id, memberId:'c', departureDate: toDateStr(addDays(today, from)), returnDate: toDateStr(addDays(today, from + n)) });
c = bcEq('90 days in the last 12 months', mBC({ ilrGrantDate: yrs(3) }), [away('a', -200, 90)]);
check('90 passes', c.eligibleNow === true, `abs12=${c.now.abs12}`);
c = bcEq('91 days in the last 12 months', mBC({ ilrGrantDate: yrs(3) }), [away('a', -200, 91)]);
check('91 fails', c.eligibleNow === false && c.now.abs12 === 91);
const old450 = n => [away('p', -1700, 90), away('q', -1300, 90), away('r', -1000, 90), away('s', -700, 90), away('u', -450, n)];
c = bcEq('450 days in 5 years', mBC({ ilrGrantDate: yrs(3) }), old450(90));
check('450 passes', c.eligibleNow === true && c.now.abs5 === 450, `abs5=${c.now.abs5}`);
c = bcEq('451 days in 5 years', mBC({ ilrGrantDate: yrs(3) }), old450(91));
check('451 fails', c.eligibleNow === false && c.now.abs5 === 451, `abs5=${c.now.abs5}`);

console.log('\nL. Citizenship: trips still to come, and trips with no return date');
const base = mBC({ ilrGrantDate: yrs(0.5) });
const plain = calcCitizenship(base, []);
c = bcEq('a planned 100-day trip', base, [away('f', 60, 100)]);
check('pushes the date later', c.earliestStr > plain.earliestStr, `${plain.earliestStr} -> ${c.earliestStr}`);
c = calcCitizenship(mBC({ ilrGrantDate: yrs(3) }), [{ id:'o', memberId:'c', departureDate: toDateStr(addDays(today,-10)), returnDate:'' }]);
check('ongoing trip gives no date', c.earliest === null && c.eligibleNow === false);
check('missing grant date degrades', calcCitizenship({ id:'x' }, []).valid === false);

console.log('\nM. Citizenship planner: earliest date after the trip, not today');
{
  const m = mBC({ ilrGrantDate: yrs(3) }), had = [away('h', -150, 75)];   // 75 days used, can apply today
  const ret = toDateStr(addDays(today, 70)), trip = { id:'n', memberId:'c', departureDate: toDateStr(addDays(today, 30)), returnDate: ret };
  const wo = calcCitizenship(m, had, ret), wi = calcCitizenship(m, [...had, trip], ret);
  check('can apply today before planning', calcCitizenship(m, had).eligibleNow === true);
  check('without the trip: the day you return', wo.earliestStr === ret);
  check('with it: later, because 75 + 40 > 90', wi.earliestStr > ret, wi.earliestStr);
  check('matches oracle', wi.earliestStr === oracleBC(m, [...had, trip], TS, ret).earliest);
  check('notBefore never claims eligible now', wo.eligibleNow === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
