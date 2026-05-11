# BNO Tracker

A bilingual (繁體中文 / English) absence-day tracker for families on the UK
**BNO (British National Overseas) visa route**. Helps BNO holders and their
dependants stay on the right side of the **180-day-in-any-rolling-12-month**
absence rule that gates Indefinite Leave to Remain (ILR).

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
3. **The rolling window.** It is *any* rolling 180-day window, not "180 days
   per calendar year." A 100-day trip in November plus another 90-day trip in
   January will breach it, even though neither year has 180 days alone.

This tracker encodes those rules and exposes them in the UI.

---

## What it does

- **Dashboard** — at-a-glance status for every family member: days absent in
  the current rolling 180-day window, days remaining, total absent since
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
- **Bilingual** — switches between traditional Chinese and English; choice
  persists across visits.

---

## BNO / ILR rules implemented

| Rule | Where | Notes |
|------|-------|-------|
| 180-day rolling window | `calcRollingWindow()` | Counted at any reference date, not just today |
| Midnight rule | `tripAbsenceRange()` / `tripAbsenceDays()` | Departure day counts, return day doesn't |
| 5-year ILR qualifying period | `ilrEarliest` calc | `bnoGrantDate + 5 years` |
| 6-month worst-window check | `worstWindow` loop | Surfaces the largest 6-month bucket since grant |
| Crown Dependencies & Ireland count as absences | UI banner on Trips tab | Implementation-wise no different; the trap is just informational |

---

## Tech & design decisions

- **Single static HTML file, no build step.** ~1000 lines of vanilla JS with
  one CDN dependency (Chart.js). Deploys to GitHub Pages with zero CI.
- **No backend, no analytics, no telemetry.** All data lives in the browser's
  `localStorage`. The repo and the deployed site never see your absence
  records.
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

## Acknowledgements

Built in collaboration with [Claude](https://claude.com) (Anthropic).
The product direction, domain research, and bug-finding came from me;
the implementation was paired with Claude. Commits are credited
accordingly.

## Licence

MIT
