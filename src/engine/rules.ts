/**
 * The gap handling rules. This is the heart of the app.
 *
 * Every rule produces a flag carrying a plain English reason, and where there
 * is something safe to offer, a proposal the user can accept in one click.
 * Nothing here ever edits the day. The engine reports, the user decides.
 */

import {
  breakRows,
  calculateDay,
  closedIntervals,
  DEFAULT_SETTINGS,
  type BreakRow,
  type Day,
  type DayResult,
  type PunchId,
  type Settings,
} from './day.ts'
import { formatClock, formatDuration, type Minutes } from './time.ts'

export type FlagCode =
  | 'missing-start'
  | 'missing-finish'
  | 'unclosed-break'
  | 'orphan-break-end'
  | 'crosses-midnight'
  | 'overlapping-breaks'
  | 'no-lunch-recorded'
  | 'implausible-length'

/**
 * What the flag means for the total beside it.
 *
 * - `needs-input` the total cannot be trusted until a human answers
 * - `assumption` the engine applied something, and the total reflects it
 * - `note` nothing changed, you are simply being told
 */
export type FlagSeverity = 'needs-input' | 'assumption' | 'note'

export interface Proposal {
  readonly punch: PunchId
  readonly value: Minutes
}

export interface Flag {
  readonly code: FlagCode
  readonly severity: FlagSeverity
  /** The input this is about, or the day as a whole. */
  readonly target: PunchId | 'day'
  readonly reason: string
  /** Null when there is nothing safe to offer, which is most of the time. */
  readonly proposal: Proposal | null
}

export interface DayEvaluation {
  readonly totals: DayResult
  readonly flags: readonly Flag[]
}

/**
 * One day in, one result out.
 *
 * This is the engine's entry point, and a week view later is a loop over it.
 *
 * @param day the six standard fields plus any extra break rows
 * @param settings house rules, rounding and the plausibility limits
 */
export function evaluateDay(day: Day, settings: Settings = DEFAULT_SETTINGS): DayEvaluation {
  const totals = calculateDay(day, settings)
  const rows = breakRows(day, settings)

  const flags: Flag[] = [
    ...missingShiftPunches(day, settings),
    ...brokenBreaks(rows),
    ...crossesMidnight(day),
    ...overlappingBreaks(day, settings),
    ...noLunchRecorded(totals, settings),
    ...implausibleLength(totals, settings),
  ]

  return { totals, flags }
}

/**
 * A shift punch is missing.
 *
 * Rebuilding a missing clock out is fair, because it is almost always a system
 * failure. It still never happens silently: the usual time is offered when one
 * is set, and otherwise the flag simply asks.
 */
function missingShiftPunches(day: Day, settings: Settings): Flag[] {
  const flags: Flag[] = []

  if (day.start !== null && day.finish === null) {
    flags.push({
      code: 'missing-finish',
      severity: 'needs-input',
      target: 'finish',
      reason: offerOr(
        settings.usualFinish,
        'There is a start but no finish, so the day has no total yet.',
        (time) => `There is a start but no finish. The usual finish of ${time} is offered, not applied.`,
      ),
      proposal: propose('finish', settings.usualFinish),
    })
  }

  if (day.finish !== null && day.start === null) {
    flags.push({
      code: 'missing-start',
      severity: 'needs-input',
      target: 'start',
      reason: offerOr(
        settings.usualStart,
        'There is a finish but no start, so the day has no total yet.',
        (time) => `There is a finish but no start. The usual start of ${time} is offered, not applied.`,
      ),
      proposal: propose('start', settings.usualStart),
    })
  }

  return flags
}

/**
 * A break with one punch missing.
 *
 * Paid breaks are harmless, because paid time is paid either way, so they get
 * a quiet note. Unpaid breaks ask for the missing time and deduct nothing in
 * the meantime. Never invent an unpaid break: the person may have worked it.
 */
function brokenBreaks(rows: readonly BreakRow[]): Flag[] {
  const flags: Flag[] = []

  for (const row of rows) {
    const missingIn = row.out !== null && row.in === null
    const missingOut = row.in !== null && row.out === null
    if (!missingIn && !missingOut) continue

    const name = nameOf(row)
    const clocked = formatClock((missingIn ? row.out : row.in) as Minutes)

    flags.push({
      code: missingIn ? 'unclosed-break' : 'orphan-break-end',
      severity: row.paid ? 'note' : 'needs-input',
      target: `${row.slot}.${missingIn ? 'in' : 'out'}`,
      reason: row.paid
        ? `The ${name} at ${clocked} has only one punch. It is paid either way, so the total is unchanged.`
        : `The ${name} at ${clocked} has only one punch. No length is assumed, so nothing has been deducted.`,
      proposal: null,
    })
  }

  return flags
}

/** A finish before the start is night work, which is ordinary and worth saying. */
function crossesMidnight(day: Day): Flag[] {
  if (day.start === null || day.finish === null || day.finish >= day.start) return []

  return [
    {
      code: 'crosses-midnight',
      severity: 'assumption',
      target: 'day',
      reason: `The finish of ${formatClock(day.finish)} is earlier than the start of ${formatClock(day.start)}, so the shift is treated as running into the next day.`,
      proposal: null,
    },
  ]
}

/** Two breaks covering the same minutes. Counted once, and said out loud. */
function overlappingBreaks(day: Day, settings: Settings): Flag[] {
  const sorted = [...closedIntervals(day, settings)].sort((a, b) => a.begin - b.begin)

  let covered = Number.NEGATIVE_INFINITY
  let overlaps = false
  for (const each of sorted) {
    if (each.begin < covered) {
      overlaps = true
      break
    }
    covered = Math.max(covered, each.end)
  }
  if (!overlaps) return []

  return [
    {
      code: 'overlapping-breaks',
      severity: 'assumption',
      target: 'day',
      reason:
        'Two breaks cover some of the same time. The overlap is counted once, and paid time wins where a paid break meets an unpaid one.',
      proposal: null,
    },
  ]
}

/**
 * A long shift with nothing unpaid recorded.
 *
 * This is a note and nothing more. Clocked does not invent a lunch, and it
 * does not ask whether one was deserved. It says what is not on the sheet.
 */
function noLunchRecorded(totals: DayResult, settings: Settings): Flag[] {
  if (totals.gross === null) return []
  if (totals.gross < settings.longShiftAfter) return []
  if (totals.unpaidBreaks > 0) return []

  return [
    {
      code: 'no-lunch-recorded',
      severity: 'note',
      target: 'day',
      reason: `A shift of ${formatDuration(totals.gross)} with no unpaid break recorded. None has been added, because one may not have been taken.`,
      proposal: null,
    },
  ]
}

/** Longer than anyone plausibly works. Flagged, never auto-fixed. */
function implausibleLength(totals: DayResult, settings: Settings): Flag[] {
  if (totals.gross === null || totals.gross <= settings.maxShift) return []

  return [
    {
      code: 'implausible-length',
      severity: 'needs-input',
      target: 'day',
      reason: `A shift of ${formatDuration(totals.gross)} is longer than the ${formatDuration(settings.maxShift)} maximum. Nothing has been changed, so check the punches.`,
      proposal: null,
    },
  ]
}

/** What to call a break row in a sentence. */
function nameOf(row: BreakRow): string {
  if (row.type === 'tbreak') return 't-break'
  if (row.type === 'lunch') return 'lunch'
  return 'break'
}

function propose(punch: PunchId, value: Minutes | null): Proposal | null {
  return value === null ? null : { punch, value }
}

function offerOr(value: Minutes | null, plain: string, offered: (time: string) => string): string {
  return value === null ? plain : offered(formatClock(value))
}
