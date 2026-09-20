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
  /** Offered when a punch is missing. Never applied silently. */
  readonly usualStart: Minutes | null
  readonly usualFinish: Minutes | null
}

export const DEFAULT_SETTINGS: Settings = {
  paid: { tbreak: true, lunch: false, other: false },
  rounding: 'exact',
  maxShift: 16 * 60,
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

/** A break with both punches present, so its length is known rather than guessed. */
interface ClosedBreak {
  readonly length: Minutes
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
  let paidBreaks = 0
  let unpaidBreaks = 0

  for (const taken of closedBreaks(day, settings)) {
    if (taken.paid) paidBreaks += taken.length
    else unpaidBreaks += taken.length
  }

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
function closedBreaks(day: Day, settings: Settings): ClosedBreak[] {
  const all = [
    { ...day.tBreak, type: 'tbreak' as const, paid: undefined },
    { ...day.lunch, type: 'lunch' as const, paid: undefined },
    ...day.extra,
  ]

  const closed: ClosedBreak[] = []
  for (const each of all) {
    if (each.out === null || each.in === null) continue
    closed.push({
      length: span(each.out, each.in),
      paid: each.paid ?? settings.paid[each.type],
    })
  }
  return closed
}

/**
 * Minutes from one time to another, wrapping past midnight.
 *
 * A finish earlier than a start means the shift crossed midnight, which is
 * ordinary for night work. Whether the result is plausible is a separate
 * question, answered by the maximum shift flag rather than here.
 */
function span(from: Minutes, to: Minutes): Minutes {
  const raw = to - from
  return raw >= 0 ? raw : raw + MINUTES_PER_DAY
}

/** Round to the nearest step, or leave exact. Halves go up. */
function round(minutes: Minutes, rounding: Rounding): Minutes {
  if (rounding === 'exact') return minutes
  return Math.round(minutes / rounding) * rounding
}
