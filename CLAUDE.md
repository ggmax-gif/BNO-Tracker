# BNO Tracker — orientation

One file: `index.html`, ~68 KB, no backend, **zero dependencies and zero network requests**. Chart.js used to be a CDN tag; it was 201 KB to draw a bar the progress bars already implied, and it went on 2026-09-03. Eighteen commits: nine in May 2026, then eight on 2026-09-03 plus the merge. Live on GitHub Pages at `ggmax-gif/BNO-Tracker`.

**Two shells, one file.** The same `index.html` runs as the web page and inside a Tauri v2 macOS app under `desktop/`, picking its storage backend at runtime by detecting `window.__TAURI__`. The web build still has no build step; the desktop build has exactly one, a `cp` in `desktop/scripts/sync.mjs`. Windows is deliberately not done — Tauri cannot cross-compile it from macOS.

**What this is.** An absence-day tracker for families on the UK BNO visa route, encoding the 180-days-in-any-rolling-12-months rule that gates ILR. **Real strangers use it to decide when to apply for indefinite leave to remain.** A wrong number here is not a cosmetic bug.

`SLATE-2026-08-25.md` says this repo holds no active slot, and caps any v2 at two features. Read it before building anything.

## Five years is a calendar anniversary, not 1,825 days — keep it that way

Fixed 2026-09-03 (`293d90b`). It had shipped wrong since May.

```js
const ilrEarliest = addYears(member.bnoGrantDate, 5);   // NOT addDays(..., 5 * 365)
```

Day arithmetic ignores every leap day in the window and lands 1–2 days **early**:

| Grant date | `5 * 365` said | True anniversary |
|---|---|---|
| 2021-01-31 | 2026-01-30 | 2026-01-31 |
| 2023-03-01 | 2028-02-28 | 2028-03-01 |

The tracker was telling people they were eligible before they were, and an ILR application filed early is refused with the fee kept — the same class of off-by-one the README criticises other trackers for. `isEligible`, `isGettingClose` and the countdown all read from `ilrEarliest`, so all three were wrong together.

`addYears()` builds the date from local parts, staying inside the `parseDate`/`toDateStr` local-calendar discipline described below. **A 29 February grant date has no anniversary in a common year; JS normalises it to 1 March and that is deliberate** — late costs a day of waiting, early costs an application. Don't "correct" it to 28 February without deciding that trade on purpose.

## The rules it encodes, and where

| Rule | Function | Note |
|---|---|---|
| 180 days in any rolling **12 months** | `calcRollingWindow()` | `WINDOW_DAYS = 365`, `MAX_ABSENCE = 180`. Evaluated at **any** reference date, not just today — that is what makes the What-If Planner meaningful |
| Midnight rule | `tripAbsenceRange()` / `tripAbsenceDays()` | Absence interval is `[departure, return − 1]` for a completed trip, `[departure, today]` for an ongoing one |
| Worst 12-month window since grant | `worstWindow` scan | Every rolling window, day by day, off a prefix-summed absence timeline. `isCompliant = worstWindow < 180` |
| ILR qualifying period | `ilrEarliest` | Calendar anniversary — see above |
| Rules provenance | `RULES_CHECKED` / `rulesStatus()` | 90-day shelf life, then the app says so instead of rendering confident numbers |

## The window is 365 days, not 180 — keep it that way

Fixed 2026-09-03 (`76087fb`). It had shipped wrong since May, in the direction that matters.

`calcRollingWindow()` measured absences over a **180-day** lookback against a 180-day cap. A 180-day window can hold at most 180 absent days, so the cap was structurally unreachable and every derived number under-reported. `worstWindow` had a second, independent defect: it sampled ten fixed 180-day blocks on a 182-day stride, leaving two uncovered days between each pair, blind to any breach straddling a boundary, and stopping 1,817 days after the grant date, leaving the last nine days of the five-year period never checked.

| Case | Before | After |
|---|---|---|
| Two 170-day trips 7 months apart | 170, **ILR Eligible** | 340, not compliant |
| 175 days each side of a block edge | worst 175, compliant | worst 350, not compliant |
| One ordinary 120-day trip this year | worst **0** | worst 120 |

Both fed `isCompliant`, which gates the eligibility badge, and both erred toward telling people they qualified when they did not. Both now read one per-member day-by-day absence timeline with a prefix sum, so any window is an O(1) subtraction and `worstWindow` scans every rolling window rather than a sample. A day set, not a sum of trip lengths, so overlapping duplicate records count once.

`isCompliant` still treats exactly 180 days as a breach — one day stricter than "no more than 180 days" as written. Left deliberately; strict is the harmless direction, but settle it against gov.uk before changing it.

**The midnight rule is the reason this tool exists, so do not "simplify" it back to inclusive day counts.** A day counts as absent only if the applicant is outside the UK at midnight UK time: the departure day counts, the return day does not. Inclusive counting over-counts every completed trip by one. The regression cases from the commit that fixed it: 7 Dec → 4 Feb is 59 days not 60, a same-day round trip is 0, and Monday → the following Monday is exactly 7.

**Crown Dependencies are informational only.** Jersey, Guernsey, the Isle of Man and the Republic of Ireland count as absences despite the Common Travel Area, but there is no code path for this — it is a UI banner on the Trips tab, in both languages. Nothing to compute; don't go looking for it.

## The date trap, already fixed — keep it fixed

`<input type="date">` yields `YYYY-MM-DD` strings, and `new Date("YYYY-MM-DD")` parses them as **UTC midnight**, which flips to the previous day in any UTC-negative timezone. `parseDate()` splits the string and builds a local date instead; `toDateStr()` formats from local getters. Every date in the app must go through those two functions. Introducing a bare `new Date(str)` anywhere reintroduces a whole-day error that only appears for users west of Greenwich.

## Constraints that are choices

- **No backend, no telemetry, no network requests at all.** In the browser, state is `localStorage`; in the desktop app it is a real file under `appDataDir()`, written atomically (temp file then rename) with one dated backup per day, newest 30 kept. The footer promises the user exactly this in both languages, and since Chart.js went it is literally true rather than nearly true. Adding an analytics tag, a hosted store, or any CDN tag breaks a stated privacy promise, not just a preference.
- **`RULES_CHECKED` is a claim that a human read gov.uk that day.** Bumping it to silence the staleness banner, without re-reading the guidance, is the one edit in this repo that converts an honesty feature into a lie. A monthly cloud routine warns before it expires; it is forbidden from touching the value, and so are you.
- **Never write before the first read completes.** Desktop storage is async. `persist()` is a no-op until `storeReady`, and a failed load renders an error rather than falling back to empty data — a blank app invites typing, and the first save would overwrite the file that failed to read.
- **Two parallel READMEs, not a translation pair.** `README.md` (English) and `README.zh-HK.md` (繁體中文 / 香港口語) carry the same content each written in its own voice. The app's UI strings are the same casual Cantonese register. Do not machine-translate one into the other, and do not merge them back into one bilingual file — that was tried and read badly in both languages.
- **The disclaimer footer is load-bearing.** Not legal advice, points at official UKVI guidance, recommends a registered solicitor for decisions that matter. It stays.

## History that explains the loose files

Three stale copies of this app used to sit elsewhere on the machine — at the home directory root, and under `Desktop/Finished Projects/LocalAI/bno-tracker/` including an orphaned git worktree. All were verified byte-identical to this repo apart from the ILR fix, and were moved to `~/.Trash/bno-stale-copies-2026-09-03/` on 2026-09-03.

The reason they existed: `~` was itself `git init`-ed at some point and the `.git` later removed, stranding `index.html`, both READMEs and `LICENSE` at the home root and leaving a worktree pointing at a repository that no longer exists. **This directory is the only copy that matters** — it holds the remote and the full history.

If a copy of this app turns up somewhere else again, diff it before assuming it has anything worth keeping. So far none ever has.
