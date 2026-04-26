# CLAUDE.md

Guidance for Claude / Cursor agents working in this repo. Keep edits load-bearing — if a section stops being true, fix it.

## Project

Family loan tracker for Nepal. Single-page web app. Two storage modes:

1. **Offline** — `localStorage` only (default fallback)
2. **Synced** — Firestore via a shared `familyCode` doc path

Stack: **Vite 5 + React 18 + Tailwind 3**, Firebase 12 (Firestore only), recharts, lucide-react. No tests, no TypeScript, no router.

## Commands

```bash
npm run dev       # vite dev server
npm run build     # production build → dist/
npm run preview   # serve built dist/
```

There is no lint, typecheck, or test script. After changes, the only validation is `npm run build` (catches import/syntax errors) and manual smoke testing in `npm run dev`.

## Layout

```
src/
  App.jsx                    # main shell — wires state, sync, modals, tabs
  firebase.js                # init/teardown + DEFAULT_CONFIG, DEFAULT_FAMILY
  main.jsx                   # entry
  index.css                  # Tailwind base + .btn-primary / .btn-secondary
  components/
    Header.jsx               # top bar + desktop tabs
    SummaryCards.jsx         # totals row
    LoanCharts.jsx           # recharts dashboard
    LoanForm.jsx             # add/edit sheet
    LoanTable.jsx            # list + row actions
    RecordPaymentSheet.jsx   # log a payment
    SyncSetup.jsx            # firebase config UI
    NepalTeraiCalculator.jsx # standalone calc tab
    Sheet.jsx                # shared bottom-sheet/modal primitive
  utils/
    calculations.js          # interest math, summaries, NPR formatting
    bsCalendar.js            # Bikram Sambat conversion tables
    nepaliDate.js            # BS ↔ AD helpers
```

## Architecture notes that bite

- **`App.jsx` owns all loan state.** Data flows down as props; CRUD callbacks (`saveLoan`, `deleteLoan`, `toggleLoan`, `savePaymentToLoan`) flow up. Don't add Context/Redux for this — it's not big enough.
- **Writes are optimistic.** `saveLoan` updates local state + `localStorage` first, then writes to Firestore. If Firestore fails, status flips to `error` but local state is *already* updated. Preserve this ordering.
- **`stripUndefinedDeep` is required before any Firestore write.** Firestore rejects `undefined`. Don't bypass it.
- **Firestore subscription is the source of truth when synced.** The `onSnapshot` listener overwrites local state on every snapshot — including local edits that haven't round-tripped yet. This is intentional; don't try to merge.
- **Sync states:** `offline | syncing | synced | error`. Only `offline` writes purely locally; the others always attempt Firestore.
- **`familyCode` is the Firestore tenant key:** path is `families/{familyCode}/loans/{loanId}`. There is no auth — anyone with the code can read/write.
- **`DEFAULT_CONFIG` and `DEFAULT_FAMILY` in `src/firebase.js` are baked-in production credentials.** Treat them as public; they're already in git. Don't add new secrets here.
- **Dates** can arrive as ISO strings, `Date`, or Firestore `Timestamp`. `normDate` in `calculations.js` handles all three — use it, don't roll your own.
- **Money formatting** uses Indian/Nepali grouping (`1,50,000`) via `formatNPR` and lakh/crore via `toLakh`. Don't use `toLocaleString` directly for currency.

## UI conventions

- Brand colors: `nepal-red` (#c8102e), `nepal-blue` (#1e3a5f). Use the Tailwind tokens, not raw hex.
- Modals use the shared `Sheet` component — bottom sheet on mobile, centered modal on `sm+`. Don't build new modal primitives.
- Z-index uses named tokens: `z-header`, `z-fab`, `z-scrim`, `z-sheet`, `z-toast`. Keep ordering consistent.
- Mobile bottom nav + FAB are in `App.jsx`; FAB hides whenever any sheet is open (`anySheetOpen`).
- Touch targets are `min-h-[48px]` (or `[32px]` for inline text buttons). Match this.
- iOS-style transitions: `duration-220 ease-ios`. Reuse, don't invent new timings.
- Safe-area insets matter — bottom paddings use `env(safe-area-inset-bottom)`. Don't strip them.

## When making changes

- **Edit existing files first.** This codebase prefers fewer, larger files over many tiny ones. `App.jsx` at ~550 lines is fine; splitting it for its own sake is not welcome.
- **Match the existing style:** no semicolons, single quotes, 2-space indent, arrow components, `useCallback` for handlers passed to children.
- **No new dependencies without a clear reason.** The dep list is intentionally short.
- **Don't add TypeScript, tests, ESLint, Prettier, or a router** unless explicitly asked — those are deliberate omissions, not oversights.
- **Verify with `npm run build`** before claiming a change is done. There's no test suite to lean on.

## Out of scope

- Auth / multi-user permissions (the family-code model is intentional)
- Server-side anything (this is a static SPA)
- Offline-first conflict resolution beyond "last write wins via Firestore snapshot"
