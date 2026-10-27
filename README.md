# BNO Tracker

🌐 **English** · [繁體中文](README.zh-HK.md)

An absence-day tracker for families on the UK BNO (British National
Overseas) visa route. It helps BNO holders and their dependants keep within
the 180-days-in-any-rolling-12-months absence rule for Indefinite Leave to
Remain (ILR).

**Live demo:** <https://ggmax-gif.github.io/BNO-Tracker/>

> ⚠️ This is a personal record-keeping tool, not legal advice. Always verify with
> the [official UKVI guidance](https://www.gov.uk/british-national-overseas-bno-visa)
> or a registered immigration solicitor for decisions that matter.

## Why this exists

Most BNO families I know track their UK absences in a spreadsheet and hope
they got the rules right. The rules have a few traps that aren't obvious:

1. The midnight rule. A day only counts as absent if you are outside the UK
   at midnight (UK time), so the day you leave counts and the day you come
   back does not. Most informal trackers are off by one here, and the error
   grows with every trip.
2. Crown Dependencies and Ireland. Trips to Jersey, Guernsey, the Isle of Man
   or the Republic of Ireland count as absences from the UK for ILR, even
   though they are part of the Common Travel Area. Many BNO holders assume
   "British Isles" trips don't count, and they do.
3. The rolling window. The limit applies to any 12-month window, not to each
   calendar year. A 100-day trip in November followed by a 90-day trip in
   January breaches it, even though neither calendar year reaches 180 days
   on its own.

This tracker encodes those rules and shows them in the UI.

## What it does

- Dashboard: the status of every family member, with days absent in the
  current rolling 12-month window, days remaining, total days absent since
  their BNO grant date, and ILR eligibility or a countdown to it.
- Family Members: add as many BNO holders, partners, children and dependants
  as you need. Each has their own grant date and absence record.
- Trips: log every trip out of the UK. A trip with no return date yet is
  counted up to today.
- What-If Planner: enter a future departure and return date and see your
  rolling window as it will stand on the day the trip ends. Most trackers
  only check today's window, which misses a breach the trip itself causes.
- Export and import: JSON for a full backup, CSV for a spreadsheet.
- Bilingual UI: switch between Traditional Chinese and English, and the app
  remembers your choice.

## BNO / ILR rules implemented

| Rule | Where | Notes |
|------|-------|-------|
| 180 days in any rolling 12 months | `calcRollingWindow()` | Counted at any reference date, not just today |
| Midnight rule | `tripAbsenceRange()` / `tripAbsenceDays()` | Departure day counts, return day doesn't |
| 5-year ILR qualifying period | `ilrEarliest` calc | `bnoGrantDate + 5 years` |
| Worst 12-month window since grant | `worstWindow` scan | Checks every rolling window, day by day, because fixed blocks miss a breach that straddles a boundary |
| Crown Dependencies & Ireland count as absences | UI banner on Trips tab | No special calculation; they are recorded as ordinary trips and the banner is a reminder |

## Tech & design decisions

- The whole app is one static HTML file of vanilla JS, with no build step
  and no dependencies. Chart.js used to load from a CDN, but at 201 KB it was
  four times the size of the app and only drew a bar the per-member progress
  bars already showed, so it is gone. The page now makes no network
  requests at all, so the privacy claim below holds without exceptions.
- There is no backend, analytics or telemetry. In the browser your data lives
  in `localStorage`, and in the desktop app it is a file on your disk. Neither
  the repo nor the deployed site ever sees your absence records.
- The same `index.html` runs as the web page and inside the desktop app, and
  picks its storage at runtime by detecting Tauri. The web version has no
  build step. The desktop build has one, a `cp` of `index.html` into the
  bundle.
- The site is hosted on GitHub Pages from the `main` branch, so pushing to
  main deploys it.
- Translations live in a dictionary read through a `t(key)` helper. Strings
  that need values are functions (`ilrApprox: (n) => …`), and the language
  choice is saved in `localStorage`.
- Dates are handled in local time. The `parseDate` and `toDateStr` helpers
  avoid `new Date("YYYY-MM-DD")`, which parses as UTC midnight and shifts the
  date back a day in American timezones.

## Run it locally

It's a single HTML file with no build step, so you can open it directly.

```sh
git clone https://github.com/ggmax-gif/BNO-Tracker.git
cd BNO-Tracker
python3 -m http.server 8000
# open http://localhost:8000
```

(You can also just double-click `index.html`, but `localStorage` works more
predictably under an `http://` origin than `file://`.)

## Desktop app (macOS)

The web version stores everything in `localStorage`, which is local but not
durable: Safari clears script-writable storage after about a week without
interaction, and any "clear browsing data" wipes it. For a tool you open once
a month to decide when to file for ILR, that is a real way to lose five years
of records.

The desktop app keeps your data in a plain JSON file, under
`~/Library/Application Support/uk.bnotracker.app/` on macOS and
`%APPDATA%\uk.bnotracker.app\` on Windows. It keeps one dated backup per day
(the newest 30) and works with no network at all.

To install it, follow [docs/INSTALL.md](docs/INSTALL.md), which covers macOS
and Windows. Neither build is code-signed, so both systems show a warning the
first time you open the app, and the guide explains how to get past it.

To build it yourself:

```sh
cd desktop
npm install
npm run build      # release .app and .dmg under src-tauri/target/release/bundle/
npm run dev        # dev mode, served from the python server on :8765
```

Local builds need the [Rust toolchain](https://rustup.rs).

Releases are built by GitHub Actions, on a `windows-latest` runner for
Windows (Tauri cannot cross-compile it from macOS) and a `macos-latest` runner
for Apple Silicon. Every push runs the engine tests, the static checks and both
builds. A `v*` tag publishes a release only if it has exactly one installer for
each platform, because a release with one missing still looks complete.

CI checks that the macOS bundle's signature is sealed. Version 0.2.0 shipped
with an unsealed signature and macOS reported the app as damaged. CI also
launches both builds to confirm they start. Nobody has clicked a button in the
Windows build yet, so treat its interface as untested until someone uses it on
a real Windows machine.

## Acknowledgements

Built with [Claude](https://claude.com) (Anthropic). The product
direction, domain research and bug-finding came from me, and I wrote the
implementation together with Claude. Commits are credited accordingly.

## Licence

[MIT](LICENSE)
