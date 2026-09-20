/**
 * The copied result: one line of text to paste into the real timesheet.
 *
 * A total that rests on an assumption must never read like one built from
 * real punches, so anything flagged is named in the line itself. Someone
 * reading the pasted text later has no access to the screen it came from.
 */

import type { Day } from './day.ts'
import type { DayEvaluation, FlagCode } from './rules.ts'
import { formatClock, formatDuration } from './time.ts'

/** Short labels for the copied line, where the full reason will not fit. */
const SHORT: Readonly<Record<FlagCode, string>> = {
  'missing-start': 'start missing',
  'missing-finish': 'finish missing',
  'unclosed-break': 'break not closed',
  'orphan-break-end': 'break start missing',
  'crosses-midnight': 'crosses midnight',
  'overlapping-breaks': 'breaks overlap',
  'no-lunch-recorded': 'no lunch recorded',
  'implausible-length': 'length implausible',
}

/**
 * Render a day and its result as a single line.
 *
 * @param day the punches, for the times at either end of the line
 * @param evaluation totals and flags from evaluateDay
 */
export function summariseDay(day: Day, evaluation: DayEvaluation): string {
  const { totals, flags } = evaluation

  const from = day.start === null ? '??:??' : formatClock(day.start)
  const to = day.finish === null ? '??:??' : formatClock(day.finish)

  const parts = [
    `${from}-${to}`,
    totals.workTime === null ? 'no total' : `worked ${formatDuration(totals.workTime)}`,
    `paid breaks ${formatDuration(totals.paidBreaks)}`,
    `unpaid breaks ${formatDuration(totals.unpaidBreaks)}`,
  ]

  const line = parts.join(', ')
  if (flags.length === 0) return line

  // Deduplicated, because two unclosed breaks are one thing to check.
  const checks = [...new Set(flags.map((each) => SHORT[each.code]))]
  return `${line} [check: ${checks.join(', ')}]`
}
