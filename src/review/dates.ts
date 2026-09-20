/**
 * Dates for reading, not for arithmetic.
 *
 * A checklist is worked through by eye, and "Sat 19 Sep" is quicker to find
 * than "2026-09-19". The year is left off because a stack of timesheets is
 * always from the last week or two, and it only adds noise.
 *
 * The names are spelled out rather than taken from Intl, so the output does
 * not change with the machine's locale and can be pinned down in a test.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** 2026-09-19 becomes "Sat 19 Sep". Anything unreadable becomes "No date". */
export function shortDate(iso: string): string {
  const match = ISO.exec(iso)
  if (!match) return 'No date'

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const when = new Date(year, month - 1, day)

  // A date that rolls over, 31 September say, is not a date somebody meant.
  if (when.getMonth() !== month - 1 || when.getDate() !== day) return 'No date'

  return `${WEEKDAYS[when.getDay()]} ${day} ${MONTHS[month - 1]}`
}
