/**
 * The day model and its derived totals.
 *
 * Punches and settings in, totals out. No React, no Date, no floats. The
 * shape mirrors the form deliberately: six standard fields, plus whatever
 * extra break rows were added. Internally every break is flattened into one
 * list, so a rule is written once rather than once per named field.
 */

import { MINUTES_PER_DAY, type Minutes } from './time.ts'

/** The type of a break decides one thing only: paid or unpaid. */
export type BreakType = 'tbreak' | 'lunch' | 'other'

/** Which break row a punch belongs to. Extra rows are keyed by position. */
export type BreakSlot = 'tBreak' | 'lunch' | `extra.${number}`

/**
 * A single input on the form. The UI keys its fields by the same string, so a
 * flag can point straight at the box that needs attention.
 */
export type PunchId = 'start' | 'finish' | `${BreakSlot}.out` | `${BreakSlot}.in`

export interface BreakPunches {
  readonly out: Minutes | null
  readonly in: Minutes | null
}

export interface ExtraBreak extends BreakPunches {
  readonly type: BreakType
  /** Per-break override. The spec only makes 'other' toggleable in the UI. */
  readonly paid?: boolean
}

/**
 * One day, shaped like the form. The six standard fields are always present,
 * even when empty, because the form always shows them.
 */
export interface Day {
  readonly start: Minutes | null
  readonly tBreak: BreakPunches
  readonly lunch: BreakPunches
  readonly finish: Minutes | null
  readonly extra: readonly ExtraBreak[]
}

/** Exact, or the nearest 1, 5, 6 or 15 minutes. */
export type Rounding = 'exact' | 1 | 5 | 6 | 15

export interface Settings {
  readonly paid: Readonly<Record<BreakType, boolean>>
  readonly rounding: Rounding
  /** Over this, a shift is implausible. Flagged, never auto-fixed. */
  readonly maxShift: Minutes
  /**
   * Past this length, a shift with no unpaid break gets a note. It is only a
   * trigger for the note. Clocked never expects a break of any length.
   */
  readonly longShiftAfter: Minutes
  /** Offered when a punch is missing. Never applied silently. */
  readonly usualStart: Minutes | null
  readonly usualFinish: Minutes | null
}

export const DEFAULT_SETTINGS: Settings = {
  paid: { tbreak: true, lunch: false, other: false },
  rounding: 'exact',
  maxShift: 16 * 60,
  longShiftAfter: 6 * 60,
  usualStart: null,
  usualFinish: null,
}

export const EMPTY_DAY: Day = {
  start: null,
  tBreak: { out: null, in: null },
  lunch: { out: null, in: null },
  finish: null,
  extra: [],
}

export interface DayResult {
  /** Finish minus start, or null while either is missing. */
  readonly gross: Minutes | null
  readonly paidBreaks: Minutes
  readonly unpaidBreaks: Minutes
  /** Gross minus unpaid breaks, rounded. Null while gross is null. */
  readonly workTime: Minutes | null
}

/** One break row, flattened out of the six fixed fields and the extra rows. */
export interface BreakRow {
  readonly slot: BreakSlot
  readonly type: BreakType
  readonly out: Minutes | null
  readonly in: Minutes | null
  readonly paid: boolean
}

/** A closed break placed on a timeline running from the shift start. */
export interface BreakInterval {
  readonly slot: BreakSlot
  readonly begin: Minutes
  readonly end: Minutes
  readonly paid: boolean
}

/**
 * Work out the totals for one day.
 *
 * Breaks with a punch missing contribute nothing, because the spec forbids
 * assuming a length. They produce a flag instead, which the gap rules add.
 *
 * @param day the six standard fields plus any extra break rows
 * @param settings which break types are paid, rounding, and the plausibility limit
 */
export function calculateDay(day: Day, settings: Settings = DEFAULT_SETTINGS): DayResult {
  // Measured as unions rather than sums, so overlapping breaks are counted
  // once. Where a paid break overlaps an unpaid one the paid time wins, since
  // the alternative is deducting time somebody actually worked.
  const intervals = closedIntervals(day, settings)
  const paidBreaks = measureUnion(intervals.filter((each) => each.paid))
  const unpaidBreaks = measureUnion(intervals) - paidBreaks

  const gross =
    day.start !== null && day.finish !== null ? span(day.start, day.finish) : null

  return {
    gross,
    paidBreaks,
    unpaidBreaks,
    // Only unpaid time comes off. A t-break never moves this number, however
    // long it ran, which is the one rule the whole app is built around.
    workTime: gross === null ? null : round(gross - unpaidBreaks, settings.rounding),
  }
}

/** Flatten the six standard fields and the extra rows into one list of breaks. */
export function breakRows(day: Day, settings: Settings): BreakRow[] {
  const rows: BreakRow[] = [
    {
      slot: 'tBreak',
      type: 'tbreak',
      out: day.tBreak.out,
      in: day.tBreak.in,
      paid: settings.paid.tbreak,
    },
    {
      slot: 'lunch',
      type: 'lunch',
      out: day.lunch.out,
      in: day.lunch.in,
      paid: settings.paid.lunch,
    },
  ]

  day.extra.forEach((each, index) => {
    rows.push({
      slot: `extra.${index}`,
      type: each.type,
      out: each.out,
      in: each.in,
      // A per-break override wins, then the house rule for that type.
      paid: each.paid ?? settings.paid[each.type],
    })
  })

  return rows
}

/**
 * Breaks with both punches, placed on one timeline.
 *
 * Offsets run from the shift start, so a lunch from 23:45 to 00:15 on a night
 * shift sits after a 22:00 start rather than before it. Without a start there
 * is nothing to measure from, so raw clock times are used instead.
 */
export function closedIntervals(day: Day, settings: Settings): BreakInterval[] {
  const origin = day.start ?? 0
  const intervals: BreakInterval[] = []

  for (const row of breakRows(day, settings)) {
    if (row.out === null || row.in === null) continue
    const begin = span(origin, row.out)
    intervals.push({
      slot: row.slot,
      begin,
      end: begin + span(row.out, row.in),
      paid: row.paid,
    })
  }

  return intervals
}

/** Total minutes covered by the intervals, counting any overlap once. */
function measureUnion(intervals: readonly BreakInterval[]): Minutes {
  const sorted = [...intervals].sort((a, b) => a.begin - b.begin)

  let total = 0
  let covered = Number.NEGATIVE_INFINITY
  for (const each of sorted) {
    const begin = Math.max(each.begin, covered)
    if (each.end > begin) total += each.end - begin
    covered = Math.max(covered, each.end)
  }
  return total
}

/**
 * Minutes from one time to another, wrapping past midnight.
 *
 * A finish earlier than a start means the shift crossed midnight, which is
 * ordinary for night work. Whether the result is plausible is a separate
 * question, answered by the maximum shift flag rather than here.
 */
export function span(from: Minutes, to: Minutes): Minutes {
  const raw = to - from
  return raw >= 0 ? raw : raw + MINUTES_PER_DAY
}

/** Round to the nearest step, or leave exact. Halves go up. */
function round(minutes: Minutes, rounding: Rounding): Minutes {
  if (rounding === 'exact') return minutes
  return Math.round(minutes / rounding) * rounding
}
