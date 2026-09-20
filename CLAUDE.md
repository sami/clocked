# Clocked

Single page timesheet calculator. One day, one form, live totals. React, TypeScript, Vite, Tailwind 4, Vitest. No backend, no storage, no accounts. Deployed on Netlify at clocked.madebysami.app.

The full spec and task tracking live in Notion: "Project: Clocked (timesheet calculator)" in the Projects database. Read it before making product decisions.

## Commands

- `npm run dev` dev server
- `npm test` Vitest, single run
- `npm run lint` ESLint
- `npm run build` type check then production build

## Rules that don't bend

- T-breaks are paid and never change the total. Lunch is unpaid and is deducted at its actual length. No break has an expected length.
- Never invent an unpaid break. A missing lunch gets a flag, not a deduction.
- Never guess silently. Every assumption produces a flag with a proposal and a plain English reason, and shows up in the totals and the copied result.
- No policing. If a feature answers "did they take too long?" it's out of scope, permanently.
- Nothing sent. No analytics, no web fonts, no backend, no network calls once loaded.
- Saved sheets live in this browser's localStorage and never leave the machine. A CSV export is the only way data moves, and the person moves it by hand. The machine this runs on clears site data at logout, so the CSV is the real persistence and localStorage is the within-session convenience.
- No real names in fixtures, tests, demo data or screenshots. Initials or IDs only, and demo data is fictional. What somebody types into the name field at runtime is their own business and stays on their machine.

## Architecture

- `src/engine/` is pure TypeScript with no React imports. Punches and settings in, totals and flags out. One day in, one result out.
- Times are integer minutes since midnight. No Date, no floats, no date library.
- Day state is local component state. No global store.
- Engine before components: the engine and its tests are finished before UI work starts.
- One Vitest test per row of the gap handling table in the spec.

## UI bar

Keyboard-only entry of a full day in under fifteen seconds. Extra break rows must never shift the layout or break the tab order of the six standard fields. Labels on every input, visible focus, AA contrast, usable one-handed on a phone.

## Writing

User-facing copy and docs are British English. Follow the human-writing skill: no em dashes, contractions, short sentences.

## Design tokens

`src/index.css` holds placeholder tokens with semantic names (`surface`, `ink`, `accent`, `flag`). The sami.codes brand bible isn't written yet. When it is, change values there, not class names in components.
