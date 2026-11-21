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

console.log('\nN. Multi-trip planner: every window, not just the one at each return');
{
  const oraclePlan = require('./oracle-plan.cjs');
  const { calcTripPlan } = E;
  const D = n => toDateStr(addDays(today, n));
  const m = { id:'p', bnoGrantDate:'2021-01-01' };
  const same = (name, trips, plan) => { const c = calcTripPlan(m, trips, plan), o = oraclePlan(m, trips, plan, TS);
    check(name + ' matches oracle', JSON.stringify([c.withPlan, c.without]) === JSON.stringify([o.withPlan, o.without]),
      `${c.withPlan.peak}/${c.without.peak}`); return c; };
  // Each trip alone is green; together they are 190 days inside one year.
  const A = { departureDate: D(30), returnDate: D(130) }, B = { departureDate: D(220), returnDate: D(310) };
  let c = same('A alone', [], [A]);   check('A alone is green', c.status === 'green' && c.withPlan.peak === 100);
  c = same('B alone', [], [B]);       check('B alone is green', c.status === 'green' && c.withPlan.peak === 90);
  c = same('A and B together', [], [A, B]);
  check('together they breach', c.status === 'red' && c.withPlan.peak === 190 && c.withPlan.firstBreach !== '');
  check('first breach is 80 days into B', c.withPlan.firstBreach === D(220 + 79), c.withPlan.firstBreach);
  // The old planner's blind spot: a trip already booked AFTER the planned one.
  const booked = [{ id:'k', memberId:'p', departureDate: D(220), returnDate: D(310) }];
  const old = calcRollingWindow(m, [...booked, { memberId:'p', ...A }], A.returnDate);
  c = same('planned trip before a booked one', booked, [A]);
  check('old view at return said 100', old.daysAbsentInWindow === 100);
  check('the scan finds the breach the old view missed', c.status === 'red' && c.without.peak === 90);
  // Overlap with a recorded trip counts each day once.
  c = same('plan overlapping a recorded trip', [{ id:'o', memberId:'p', departureDate: D(30), returnDate: D(80) }], [A]);
  check('overlap counted once', c.withPlan.peak === 100);
  check('per-trip days use the midnight rule', c.perTrip[0].days === 100 && c.totalDays === 100);
  // A recorded trip with no return date: refuse rather than guess.
  c = calcTripPlan(m, [{ id:'g', memberId:'p', departureDate: D(-10), returnDate:'' }], [A]);
  check('ongoing recorded trip gives no answer', c.ongoing === true);
  check('missing grant date degrades', calcTripPlan({ id:'x' }, [], [A]).valid === false);
}

console.log('\nO. Planner: does each trip fit in the days left?');
{
  const oraclePlan = require('./oracle-plan.cjs');
  const { calcTripPlan } = E;
  const D = n => toDateStr(addDays(today, n));
  const m = { id:'p', bnoGrantDate:'2021-01-01' };
  const A = { departureDate: D(30), returnDate: D(130) }, B = { departureDate: D(220), returnDate: D(310) };
  let c = calcTripPlan(m, [], [A]);
  check('alone: 179 days allowed (180 is a breach)', c.perTrip[0].maxDays === 179 && c.perTrip[0].latestReturn === D(30 + 179));
  check('alone: 100-day trip fits with 79 to spare', c.perTrip[0].fits && c.perTrip[0].spare === 79);
  c = calcTripPlan(m, [], [A, B]);
  check('together: B may last 79 days next to A', c.perTrip[1].maxDays === 79 && c.perTrip[1].over === 11);
  check('together: A may last 89 days next to B', c.perTrip[0].maxDays === 89 && c.perTrip[0].over === 11);
  check('together: B latest return is 79 days after it leaves', c.perTrip[1].latestReturn === D(220 + 79));
  // Cutting B to its latest return really does make the plan fit.
  const fixed = calcTripPlan(m, [], [A, { ...B, returnDate: c.perTrip[1].latestReturn }]);
  check('returning on the latest date stays within the limit', fixed.status !== 'red' && fixed.withPlan.peak === 179);
  const o = oraclePlan(m, [], [A, { ...B, returnDate: D(220 + 80) }], TS);
  check('one day later breaches (oracle)', o.withPlan.peak === 180);
  // Recorded trips that already breach: no length of the planned trip fits.
  c = calcTripPlan(m, [{ id:'x', memberId:'p', departureDate: D(10), returnDate: D(200) }], [{ departureDate: D(300), returnDate: D(301) }]);
  check('already over without the trip', c.perTrip[0].alreadyOver === true && c.perTrip[0].fits === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
