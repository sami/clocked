/**
 * Time handling for the rules engine.
 *
 * Every time in Clocked is an integer count of minutes since midnight
 * (0 to 1439). No Date objects, no floats, no date library.
 */

export type Minutes = number

export const MINUTES_PER_DAY = 24 * 60

/** Hours and minutes split by an explicit separator: `9:15`, `9.15`, `9 15`. */
const SEPARATED = /^(\d{1,2})[:. ](\d{1,2})$/

/** Bare digits: `9`, `17`, `915`, `0915`. The length decides how to read them. */
const BARE_DIGITS = /^\d{1,4}$/

/**
 * Parse what someone typed into a time field.
 *
 * The spec requires `0915`, `9:15` and `915` to all mean 09:15, with 24 hour
 * handling. Anything that can't be read as a time returns null, and the UI
 * treats null as "not filled in yet" rather than as an error to shout about.
 *
 * Judgement calls, all made for keyboard speed without ever reading a time
 * the typist didn't type:
 *
 * - One or two bare digits are whole hours, so `9` is 09:00 and `17` is 17:00.
 *   Typing a day against the fifteen second target means `9` beats `0900`.
 * - A full stop or a space separates as well as a colon, because the numeric
 *   keypad people reach for has a full stop on it and no colon.
 * - `2400` is rejected. Midnight is `0000`, and keeping one spelling of it
 *   holds the 0 to 1439 invariant that the rest of the engine relies on. A
 *   shift finishing at midnight is a cross-midnight shift, handled there.
 * - After a separator the digits are minutes as written, so `9:5` is 09:05.
 *   Reading it as 09:50 would be inventing a number nobody typed.
 * - No am/pm. Clock terminals print 24 hour time and so does this field.
 *
 * @param input raw text from a time field, possibly with stray whitespace
 * @returns minutes since midnight, or null if the input isn't a valid time
 */
export function parseTime(input: string): Minutes | null {
  const trimmed = input.trim()

  const separated = SEPARATED.exec(trimmed)
  if (separated) {
    return toMinutes(Number(separated[1]), Number(separated[2]))
  }

  if (!BARE_DIGITS.test(trimmed)) return null

  // One or two digits are an hour on its own. Three or four split from the
  // right, so the last two digits are always the minutes.
  if (trimmed.length <= 2) return toMinutes(Number(trimmed), 0)
  return toMinutes(Number(trimmed.slice(0, -2)), Number(trimmed.slice(-2)))
}

/** Combine hours and minutes, rejecting anything off a 24 hour clock. */
function toMinutes(hours: number, minutes: number): Minutes | null {
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Format minutes since midnight as a 24 hour clock time, e.g. 555 -> "09:15". */
export function formatClock(minutes: Minutes): string {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0')
  const mm = String(wrapped % 60).padStart(2, '0')
  return `${hh}:${mm}`
}
