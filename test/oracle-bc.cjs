// Brute-force reference for the naturalisation tests. Independent of the
// engine's date code on purpose: days are integers (days since the Unix epoch,
// via Date.UTC) and "same date 5 years earlier" is done on the Y-M-D string,
// so a bug in yearsBefore() or the prefix sums cannot be mirrored here.
const DAY = 86400000;
const num = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
const str = n => new Date(n * DAY).toISOString().slice(0, 10);
const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
// Same month and day n years back; 29 Feb with no counterpart -> 28 Feb.
const back = (s, n) => {
  let [y, m, d] = s.split('-').map(Number); y -= n;
  if (m === 2 && d === 29 && !leap(y)) d = 28;
  return num(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
};
const fwd = (s, n) => {   // JS-style: 29 Feb + n years in a common year -> 1 Mar
  let [y, m, d] = s.split('-').map(Number); y += n;
  if (m === 2 && d === 29 && !leap(y)) { m = 3; d = 1; }
  return num(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
};

module.exports = function oracleBC(member, trips, todayS, notBeforeS) {
  const today = num(todayS), grant = num(member.bnoGrantDate);
  const mine = trips.filter(t => t.memberId === member.id);
  if (mine.some(t => !t.returnDate)) return { earliest: null };
  const away = new Set();
  for (const t of mine) for (let x = num(t.departureDate); x < num(t.returnDate); x++) if (x >= grant) away.add(x);
  const ilrBase = member.ilrGrantDate || str(fwd(member.bnoGrantDate, 5));
  const lower = Math.max(fwd(ilrBase, 1), fwd(member.bnoGrantDate, 5));
  const test = D => {
    const s5 = back(str(D), 5) + 1, s1 = back(str(D), 1) + 1;
    let a5 = 0, a1 = 0;
    for (let x = s5; x <= D; x++) if (away.has(x)) { a5++; if (x >= s1) a1++; }
    return { abs5: a5, abs12: a1, present: !away.has(s5), ok: a5 <= 450 && a1 <= 90 && !away.has(s5) };
  };
  for (let D = Math.max(lower, today, notBeforeS ? num(notBeforeS) : -Infinity); D < today + 40000; D++) if (test(D).ok) return { earliest: str(D), now: test(today) };
  return { earliest: 'none', now: test(today) };
};
