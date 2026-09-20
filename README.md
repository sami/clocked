# Clocked

Clocked is a timesheet calculator. You type in a day's clockings and it tells you how long the person worked and how long their breaks ran, even when half the punches are missing.

**Status:** version 1 is built and runs locally. The engine and the single page are done, with 89 tests over the rules. Not deployed yet, so [clocked.madebysami.app](https://clocked.madebysami.app) isn't live. Version 1 ships by 11 October 2026.

## What problem does it solve?

Timesheets arrive incomplete. Someone forgets to clock out, or logs a lunch and never comes back from it. The arithmetic is easy. The judgement about the missing punch is where the errors and the arguments come from.

Most calculators assume clean input. Clocked expects the input to be wrong, flags what's missing, proposes a fix with the reason, and lets you override it. It never guesses silently.

## How does it treat breaks?

T-breaks are paid and lunch is unpaid. That's the only rule.

| Break | Paid? | Effect on work time |
| --- | --- | --- |
| T-break | Yes | None, however long it ran |
| Lunch | No | Deducted at its actual length |
| Other | No by default | Deducted unless you mark it paid |

No break has an expected length. Clocked won't tell you someone took too long, because that isn't its job. If a feature answers "did they take too long?" instead of "how long did they work?", it doesn't belong here.

## What happens when a punch is missing?

Every gap produces a flag and a proposed fix, with the reason in plain English. A total that rests on an assumption never looks the same as one that rests on real punches.

One case gets special care: Clocked will never invent an unpaid break. A missing clock out is almost certainly a system failure, so rebuilding it is fair. A missing lunch might mean nobody took lunch, and deducting time a person worked is the one mistake that costs them money.

## Is any data stored?

No. There's no account and no backend. The day lives in memory and the Clear button wipes it. The site's headers block outgoing requests, so the browser holds it to that.

Use initials or IDs if you need to label anything. Real names stay out.

## How do I run it?

You'll need Node 24.

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Runs the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run build` | Type check, then a production build into `dist` |

## How is the code laid out?

```
src/
  engine/       Pure TypeScript. Punches and settings in, totals and flags out.
    time.ts     Parsing and formatting. Minutes since midnight, as integers.
    day.ts      The day model and the four derived totals.
    rules.ts    The gap rules. One flag per row of the table above.
    summary.ts  The copied result, as a single line.
  day/input.ts  What the form holds, and how it becomes a day.
  fixtures/     Ten awkward days the engine has to survive.
  components/   The six fields, the totals, the flags, the house rules.
  App.tsx       The single page.
  index.css     Tailwind and the design tokens.
```

The engine is a pure function with no React in it. Times are integer minutes since midnight, so there's no date library and no floating point. It takes one day and returns one result, which means a week view later is a loop over it.

## What's left to build?

- [x] Rules engine, one test per row of the gap table
- [x] Single page form with live totals and flags
- [x] Extra break rows and the Clear control
- [x] Copy result, example day, house rules
- [x] Ten fixture days, one per awkward shape, covering every gap rule
- [ ] Replace those fixtures with real anonymised days from a sheet
- [ ] Mobile and accessibility polish pass
- [ ] Deployed, with this README rewritten as the case study

## Case study

To be written at launch.

| | |
| --- | --- |
| Goal | Remove manual timesheet arithmetic and rebuild missing punches in the open, without policing anyone |
| My contribution | Sole designer and developer |
| Method | Rules engine first, tested against real awkward days from work |
| Deliverables | Live app, public repo, screenshots of a completed day and a flagged day |
| Skills | React, TypeScript, state design, testing, accessibility, responsive UI |
| Resources | React, TypeScript, Vite, Tailwind, Vitest, Netlify |
| Link | [clocked.madebysami.app](https://clocked.madebysami.app) |
| Completion date | October 2026 |
| Visual | To come |

## Licence

MIT. See [LICENSE](LICENSE).
