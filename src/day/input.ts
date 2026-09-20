/**
 * What the form holds, and how it becomes a day the engine can read.
 *
 * The form keeps raw text, not minutes. Someone halfway through typing `09`
 * has not made a mistake, and their keystrokes belong to them until they are
 * a valid time. Parsing happens on the way to the engine, never on the way
 * into the box.
 */

import type { BreakType, Day, PunchId } from '../engine/day.ts'
import { parseTime } from '../engine/time.ts'

export interface BreakTextPunches {
  readonly out: string
  readonly in: string
}

export interface ExtraBreakInput extends BreakTextPunches {
  readonly type: BreakType
  readonly paid?: boolean
}

export interface DayInput {
  readonly start: string
  readonly tBreak: BreakTextPunches
  readonly lunch: BreakTextPunches
  readonly finish: string
  readonly extra: readonly ExtraBreakInput[]
}

const NO_PUNCHES: BreakTextPunches = { out: '', in: '' }

export const EMPTY_INPUT: DayInput = {
  start: '',
  tBreak: NO_PUNCHES,
  lunch: NO_PUNCHES,
  finish: '',
  extra: [],
}

/**
 * A fictional day, so a first-time visitor sees the thing working at once.
 * Invented, never anyone's real shift, and it carries no name.
 */
export const EXAMPLE_INPUT: DayInput = {
  start: '0730',
  tBreak: { out: '1015', in: '1030' },
  lunch: { out: '1300', in: '1342' },
  finish: '1615',
  extra: [],
}

/** Parse the text into a day. Anything unreadable is simply not filled in yet. */
export function toDay(input: DayInput): Day {
  return {
    start: parseTime(input.start),
    tBreak: { out: parseTime(input.tBreak.out), in: parseTime(input.tBreak.in) },
    lunch: { out: parseTime(input.lunch.out), in: parseTime(input.lunch.in) },
    finish: parseTime(input.finish),
    extra: input.extra.map((each) => ({
      type: each.type,
      out: parseTime(each.out),
      in: parseTime(each.in),
      paid: each.paid,
    })),
  }
}

/** Set one punch by the same id the engine uses in its flags. */
export function setPunch(input: DayInput, punch: PunchId, text: string): DayInput {
  if (punch === 'start') return { ...input, start: text }
  if (punch === 'finish') return { ...input, finish: text }

  const [slot, index, side] = splitPunch(punch)

  if (slot === 'extra') {
    return {
      ...input,
      extra: input.extra.map((each, at) => (at === index ? { ...each, [side]: text } : each)),
    }
  }

  return { ...input, [slot]: { ...input[slot], [side]: text } }
}

/** Mark an extra break paid or unpaid. Only 'other' is toggleable in the UI. */
export function setExtraPaid(input: DayInput, index: number, paid: boolean): DayInput {
  return {
    ...input,
    extra: input.extra.map((each, at) => (at === index ? { ...each, paid } : each)),
  }
}

export function addExtraBreak(input: DayInput, type: BreakType): DayInput {
  return { ...input, extra: [...input.extra, { type, out: '', in: '' }] }
}

export function removeExtraBreak(input: DayInput, index: number): DayInput {
  return { ...input, extra: input.extra.filter((_, at) => at !== index) }
}

/** Pull a punch id apart into the row it belongs to and which side it is. */
function splitPunch(
  punch: PunchId,
): ['tBreak' | 'lunch', number, 'out' | 'in'] | ['extra', number, 'out' | 'in'] {
  const pieces = punch.split('.')
  const side = pieces[pieces.length - 1] === 'out' ? 'out' : 'in'

  if (pieces[0] === 'extra') return ['extra', Number(pieces[1]), side]
  return [pieces[0] === 'lunch' ? 'lunch' : 'tBreak', -1, side]
}
