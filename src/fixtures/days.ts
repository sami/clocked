/**
 * Ten awkward days, one per shape the engine has to survive.
 *
 * These are entered as raw text rather than minutes, because that is how a
 * day actually arrives: somebody types it. A fixture therefore tests the
 * parser, the totals and the rules in one go.
 *
 * Every day here is invented. Real cases beat invented ones, so each of these
 * is meant to be replaced by an anonymised day from a real sheet: paste the
 * punches in, correct the expectations, and change `source` to 'real'. No
 * names, ever. An id and a one line note is all a fixture needs.
 */

import type { DayInput } from '../day/input.ts'
import type { Settings } from '../engine/day.ts'
import type { FlagCode } from '../engine/rules.ts'
import type { Minutes } from '../engine/time.ts'

export interface Fixture {
  readonly id: string
  readonly label: string
  /** 'invented' until a real anonymised day replaces it. */
  readonly source: 'invented' | 'real'
  readonly input: DayInput
  readonly settings?: Partial<Settings>
  readonly expect: {
    readonly workTime: Minutes | null
    readonly paidBreaks: Minutes
    readonly unpaidBreaks: Minutes
    /** Every code the day should raise, in the order the engine returns them. */
    readonly flags: readonly FlagCode[]
  }
}

/** Shorthand, so a fixture reads as the six fields and nothing else. */
function punches(over: Partial<DayInput> = {}): DayInput {
  return {
    start: '',
    tBreak: { out: '', in: '' },
    lunch: { out: '', in: '' },
    finish: '',
    extra: [],
    ...over,
  }
}

export const FIXTURES: readonly Fixture[] = [
  {
    id: 'FX-01',
    label: 'Clean day, the control',
    source: 'invented',
    input: punches({
      start: '0745',
      tBreak: { out: '1000', in: '1015' },
      lunch: { out: '1300', in: '1330' },
      finish: '1615',
    }),
    expect: { workTime: 480, paidBreaks: 15, unpaidBreaks: 30, flags: [] },
  },
  {
    id: 'FX-02',
    label: 'Missing clock out',
    source: 'invented',
    input: punches({
      start: '0600',
      tBreak: { out: '0900', in: '0915' },
      lunch: { out: '1200', in: '1230' },
      finish: '',
    }),
    // No total at all, rather than a total built on a guessed finish.
    expect: { workTime: null, paidBreaks: 15, unpaidBreaks: 30, flags: ['missing-finish'] },
  },
  {
    id: 'FX-03',
    label: 'Missing clock in',
    source: 'invented',
    input: punches({
      start: '',
      lunch: { out: '1200', in: '1230' },
      finish: '1700',
    }),
    expect: { workTime: null, paidBreaks: 0, unpaidBreaks: 30, flags: ['missing-start'] },
  },
  {
    id: 'FX-04',
    label: 'Lunch started and never ended',
    source: 'invented',
    input: punches({
      start: '0800',
      lunch: { out: '1230', in: '' },
      finish: '1630',
    }),
    // Nothing deducted. Inventing a lunch length is the one mistake that
    // costs somebody money, so the day is flagged instead.
    expect: {
      workTime: 510,
      paidBreaks: 0,
      unpaidBreaks: 0,
      flags: ['unclosed-break', 'no-lunch-recorded'],
    },
  },
  {
    id: 'FX-05',
    label: 'T-break end with no start',
    source: 'invented',
    input: punches({
      start: '0900',
      tBreak: { out: '', in: '1045' },
      lunch: { out: '1300', in: '1330' },
      finish: '1730',
    }),
    // Paid either way, so this one is a quiet note and the total is normal.
    expect: { workTime: 480, paidBreaks: 0, unpaidBreaks: 30, flags: ['orphan-break-end'] },
  },
  {
    id: 'FX-06',
    label: 'Long shift with no break recorded',
    source: 'invented',
    input: punches({ start: '0600', finish: '1800' }),
    expect: { workTime: 720, paidBreaks: 0, unpaidBreaks: 0, flags: ['no-lunch-recorded'] },
  },
  {
    id: 'FX-07',
    label: 'Night shift crossing midnight, with a break either side',
    source: 'invented',
    input: punches({
      start: '2200',
      tBreak: { out: '0000', in: '0015' },
      lunch: { out: '0230', in: '0300' },
      finish: '0600',
    }),
    expect: { workTime: 450, paidBreaks: 15, unpaidBreaks: 30, flags: ['crosses-midnight'] },
  },
  {
    id: 'FX-08',
    label: 'T-break overlapping a lunch',
    source: 'invented',
    input: punches({
      start: '0900',
      tBreak: { out: '1300', in: '1315' },
      lunch: { out: '1300', in: '1330' },
      finish: '1730',
    }),
    // The overlap is counted once, and counted as paid.
    expect: {
      workTime: 495,
      paidBreaks: 15,
      unpaidBreaks: 15,
      flags: ['overlapping-breaks'],
    },
  },
  {
    id: 'FX-09',
    label: 'Implausible eighteen and a half hour entry',
    source: 'invented',
    input: punches({ start: '0500', finish: '2330' }),
    // Flagged, never auto-fixed. The total stands as entered.
    expect: {
      workTime: 1110,
      paidBreaks: 0,
      unpaidBreaks: 0,
      flags: ['no-lunch-recorded', 'implausible-length'],
    },
  },
  {
    id: 'FX-10',
    label: 'Extra rows, a second lunch and an unpaid other break',
    source: 'invented',
    input: punches({
      start: '0700',
      tBreak: { out: '0930', in: '0945' },
      lunch: { out: '1200', in: '1230' },
      finish: '1700',
      extra: [
        { type: 'lunch', out: '1500', in: '1515' },
        { type: 'other', out: '1600', in: '1610' },
      ],
    }),
    expect: { workTime: 545, paidBreaks: 15, unpaidBreaks: 55, flags: [] },
  },
]
