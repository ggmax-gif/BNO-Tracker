# BNO Tracker

🌐 **English** · [繁體中文](README.zh-HK.md)

An absence-day tracker for families on the UK **BNO (British National
Overseas) visa route**. Helps BNO holders and their dependants stay on the
right side of the **180-day-in-any-rolling-12-month** absence rule that gates
Indefinite Leave to Remain (ILR).

**Live demo:** <https://ggmax-gif.github.io/BNO-Tracker/>

> ⚠️ Personal record-keeping tool — **not** legal advice. Always verify with
> the [official UKVI guidance](https://www.gov.uk/british-national-overseas-bno-visa)
> or a registered immigration solicitor for decisions that matter.

---

## Why this exists

Most BNO families I know are tracking their UK absences in a spreadsheet and
hoping they got the rules right. The problem is that the rules have a few
non-obvious traps:

1. **The midnight rule.** A day only counts as "absent" if you are outside the
   UK at midnight (UK time). The day of departure counts; the day of return
   does not. Most informal trackers get this off-by-one, which makes a
   difference once you stack up multiple trips.
2. **Crown Dependencies and Ireland.** Trips to **Jersey, Guernsey, the Isle
   of Man** or the **Republic of Ireland** count as absences from the UK for
   ILR — even though they are part of the Common Travel Area. Many BNO
   holders assume "British Isles" trips are free. They are not.
3. **The rolling window.** It is *any* rolling 12-month window, not "180 days
   per calendar year." A 100-day trip in November plus another 90-day trip in
   January will breach it, even though neither calendar year has 180 days alone.

This tracker encodes those rules and exposes them in the UI.

---

## What it does

- **Dashboard** — at-a-glance status for every family member: days absent in
  the current rolling 12-month window, days remaining, total absent since
  their BNO grant date, and ILR eligibility / countdown.
- **Family Members** — add as many BNO holders / partners / children /
  dependants as you need; each has their own grant date and absence record.
- **Trips** — log every trip out of the UK. Open-ended trips (no return date
  yet) are supported and counted up to today.
- **What-If Planner** — pick a future departure and return date and see
  exactly what your rolling window will look like *at the end of the trip*
  (not just today — that distinction matters and is where most trackers go
  wrong).
- **Export / import** — JSON for full backup, CSV for spreadsheet analysis.
- **Bilingual UI** — switches between Traditional Chinese and English;
  choice persists across visits.

---

## BNO / ILR rules implemented

| Rule | Where | Notes |
|------|-------|-------|
| 180 days in any rolling 12 months | `calcRollingWindow()` | Counted at any reference date, not just today |
| Midnight rule | `tripAbsenceRange()` / `tripAbsenceDays()` | Departure day counts, return day doesn't |
| 5-year ILR qualifying period | `ilrEarliest` calc | `bnoGrantDate + 5 years` |
| Worst 12-month window since grant | `worstWindow` scan | Every rolling window, day by day — fixed buckets miss a breach that straddles a boundary |
| Crown Dependencies & Ireland count as absences | UI banner on Trips tab | Implementation-wise no different; the trap is just informational |

---

## Tech & design decisions

- **Single static HTML file, no build step, no dependencies.** ~1100 lines of
  vanilla JS and nothing else. Chart.js used to be a CDN dependency; it was
  201 KB — four times the whole app — to draw a bar the per-member progress
  bars already implied, so it is gone. The page now issues **zero network
  requests**, which is what makes the privacy claim below literally true
  rather than nearly true.
- **No backend, no analytics, no telemetry.** In the browser, data lives in
  `localStorage`. In the desktop app it is a real file on your disk. The repo
  and the deployed site never see your absence records either way.
- **One file, two shells.** The same `index.html` runs as the web page and
  inside the desktop app; it picks its storage backend at runtime by detecting
  Tauri. The web build still has no build step. The desktop build has exactly
  one: a `cp` of `index.html` into the bundle.
- **Hosted on GitHub Pages** off the `main` branch. Pushing to main is the
  whole deploy pipeline.
- **i18n via a translation dictionary + a `t(key)` helper.** Strings as
  functions for interpolation (`ilrApprox: (n) => …`). Language preference
  persisted to `localStorage`.
- **Date arithmetic explicitly in local time.** `parseDate` /
  `toDateStr` helpers avoid the `new Date("YYYY-MM-DD")` UTC-midnight trap
  that silently shifts dates by one day in Americas timezones.

---

## Run it locally

It's a single HTML file with no build step — just open it.

```sh
git clone https://github.com/ggmax-gif/BNO-Tracker.git
cd BNO-Tracker
python3 -m http.server 8000
# open http://localhost:8000
```

(You can also just double-click `index.html`, but `localStorage` works more
predictably under an `http://` origin than `file://`.)

---

## Desktop app (macOS)

The web version stores everything in `localStorage`, which is local but not
durable: Safari clears script-writable storage after about a week without
interaction, and any "clear browsing data" wipes it. For a tool you open once
a month to decide when to file for ILR, that is a real way to lose five years
of records.

The desktop build fixes that. Your data is a plain JSON file in
`~/Library/Application Support/uk.bnotracker.app/`, it keeps one dated backup
per day (newest 30), and it works with no network at all.

**Installing:** see [docs/INSTALL.md](docs/INSTALL.md). The app is unsigned, so
macOS will warn you the first time — the guide walks through it.

**Building it yourself:**

```sh
cd desktop
npm install
npm run build      # release .app and .dmg under src-tauri/target/release/bundle/
npm run dev        # dev mode, served from the python server on :8765
```

Requires the [Rust toolchain](https://rustup.rs). Windows is a later phase —
Tauri cannot cross-compile it from macOS, so it needs CI or a Windows machine.

---

## Acknowledgements

Built in collaboration with [Claude](https://claude.com) (Anthropic).
The product direction, domain research, and bug-finding came from me;
the implementation was paired with Claude. Commits are credited
accordingly.

## Licence

[MIT](LICENSE)
