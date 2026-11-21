// Brute-force reference for the multi-trip planner. Integer day numbers
// (Date.UTC) and a plain day set, with every window counted day by day, so
// it shares nothing with the engine's prefix sums or date helpers.
const DAY = 86400000;
const num = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
const str = n => new Date(n * DAY).toISOString().slice(0, 10);

module.exports = function oraclePlan(member, trips, planned, todayS) {
  const today = num(todayS), grant = num(member.bnoGrantDate);
  const mine = trips.filter(t => t.memberId === member.id);
  if (mine.some(t => !t.returnDate)) return { ongoing: true };
  const days = list => { const s = new Set();
    for (const t of list) for (let x = num(t.departureDate); x < num(t.returnDate); x++) if (x >= grant) s.add(x);
    return s; };
  let start = today, last = today;
  for (const p of planned) start = Math.min(start, num(p.departureDate));
  for (const t of [...mine, ...planned]) last = Math.max(last, num(t.returnDate));
  const lo = Math.max(start, grant), hi = last + 364;
  const scan = set => { let peak = 0, at = null, breach = null;
    for (let d = lo; d <= hi; d++) { let n = 0;
      for (let x = Math.max(d - 364, grant); x <= d; x++) if (set.has(x)) n++;
      if (at === null || n > peak) { peak = n; at = d; }
      if (breach === null && n >= 180) breach = d; }
    return { peak, peakEnd: at === null ? '' : str(at), firstBreach: breach === null ? '' : str(breach) }; };
  return { ongoing: false, withPlan: scan(days([...mine, ...planned])), without: scan(days(mine)) };
};
