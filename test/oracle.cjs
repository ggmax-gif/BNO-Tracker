// Brute-force reference implementation. Deliberately slow and obvious: it walks
// every day and counts, with no prefix sums or clever windowing, so that a bug
// in the real engine's optimisation cannot be mirrored here.
module.exports = function makeOracle(E) {
  const { parseDate, toDateStr, addDays } = E;
  return function oracle(grantStr, trips, ref) {
    const grant = parseDate(grantStr); grant.setHours(0,0,0,0);
    const days = new Set();
    for (const tr of trips) {
      const r = E.tripAbsenceRange(tr, ref);
      if (!r.valid) continue;
      for (let d = new Date(r.start.getTime()); d <= r.end; d = addDays(d,1))
        if (d >= grant && d <= ref) days.add(toDateStr(d));
    }
    let worst = 0;
    for (let d = new Date(grant.getTime()); d <= ref; d = addDays(d,1)) {
      const ws = addDays(d,-364); let n = 0;
      for (let x = new Date(Math.max(ws.getTime(), grant.getTime())); x <= d; x = addDays(x,1))
        if (days.has(toDateStr(x))) n++;
      if (n > worst) worst = n;
    }
    let cur = 0; const cs = addDays(ref,-364);
    for (let x = new Date(Math.max(cs.getTime(), grant.getTime())); x <= ref; x = addDays(x,1))
      if (days.has(toDateStr(x))) cur++;
    return { worst, current: cur, total: days.size };
  };
};
