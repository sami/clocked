import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, EMPTY_DAY, type Day, type Settings } from './day.ts'
import { evaluateDay, type FlagCode } from './rules.ts'

function day(over: Partial<Day> = {}): Day {
  return { ...EMPTY_DAY, ...over }
}

function settings(over: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...over }
}

/** The codes raised for a day, for asserting on the whole set at once. */
function codes(result: ReturnType<typeof evaluateDay>): FlagCode[] {
  return result.flags.map((each) => each.code)
}

function flag(result: ReturnType<typeof evaluateDay>, code: FlagCode) {
  const found = result.flags.find((each) => each.code === code)
  if (!found) throw new Error(`no ${code} flag in [${codes(result).join(', ')}]`)
  return found
}

const AT_0900 = 540
const AT_1300 = 780
const AT_1330 = 810
const AT_1730 = 1050

const CLEAN_DAY = day({
  start: AT_0900,
  tBreak: { out: 630, in: 645 },
  lunch: { out: AT_1300, in: AT_1330 },
  finish: AT_1730,
})

describe('evaluateDay', () => {
  it('raises nothing for a clean day', () => {
    const result = evaluateDay(CLEAN_DAY)
    expect(result.flags).toEqual([])
    expect(result.totals.workTime).toBe(480)
  })

  it('raises nothing for an empty day, because nothing is wrong yet', () => {
    expect(evaluateDay(EMPTY_DAY).flags).toEqual([])
  })

  // The short label is what a printed checklist actually shows, so it is
  // pinned here rather than left to drift.
  describe('short labels', () => {
    it.each([
      [day({ ...CLEAN_DAY, finish: null }), 'missing-finish', 'No finish clocked'],
      [day({ ...CLEAN_DAY, start: null }), 'missing-start', 'No start clocked'],
      [
        day({ ...CLEAN_DAY, lunch: { out: AT_1300, in: null } }),
        'unclosed-break',
        'Lunch started 13:00, not finished',
      ],
      [
        day({ ...CLEAN_DAY, tBreak: { out: 630, in: null } }),
        'unclosed-break',
        'T-break started 10:30, not finished',
      ],
      [
        day({ ...CLEAN_DAY, lunch: { out: null, in: AT_1330 } }),
        'orphan-break-end',
        'Lunch ended 13:30, no start',
      ],
      [
        day({ start: 22 * 60, finish: 6 * 60 }),
        'crosses-midnight',
        'Crosses midnight, 22:00 to 06:00',
      ],
      [
        day({ start: AT_0900, finish: AT_1730 }),
        'no-lunch-recorded',
        'No lunch recorded on 8h 30m',
      ],
      [
        day({ start: 5 * 60, finish: 23 * 60 + 30 }),
        'implausible-length',
        '18h 30m shift, over the 16h limit',
      ],
    ] as const)('reads %#: %s', (given, code, expected) => {
      expect(flag(evaluateDay(given), code).short).toBe(expected)
    })

    it('keeps the short label short', () => {
      const messy = day({ start: 5 * 60, finish: 23 * 60 + 30 })
      for (const raised of evaluateDay(messy).flags) {
        expect(raised.short.length).toBeLessThanOrEqual(45)
      }
    })
  })

  // One test per row of the gap handling table in the spec.

  describe('no shift end', () => {
    it('asks, and offers nothing when no usual finish is set', () => {
      const result = evaluateDay(day({ ...CLEAN_DAY, finish: null }))
      const raised = flag(result, 'missing-finish')
      expect(raised).toMatchObject({ severity: 'needs-input', target: 'finish', proposal: null })
      expect(raised.reason).toMatch(/no total yet/)
    })

    it('offers the usual finish without applying it', () => {
      const result = evaluateDay(
        day({ ...CLEAN_DAY, finish: null }),
        settings({ usualFinish: AT_1730 }),
      )
      expect(flag(result, 'missing-finish').proposal).toEqual({ punch: 'finish', value: AT_1730 })
      expect(flag(result, 'missing-finish').reason).toContain('17:30 is offered, not applied')
      // Offered, so the total is still absent.
      expect(result.totals.workTime).toBeNull()
    })
  })

  describe('no shift start', () => {
    it('asks, and offers the usual start when one is set', () => {
      const result = evaluateDay(
        day({ ...CLEAN_DAY, start: null }),
        settings({ usualStart: AT_0900 }),
      )
      expect(flag(result, 'missing-start')).toMatchObject({
        severity: 'needs-input',
        target: 'start',
        proposal: { punch: 'start', value: AT_0900 },
      })
      expect(result.totals.gross).toBeNull()
    })
  })

  describe('break start, no break end', () => {
    it('notes an unclosed t-break quietly, because paid time is paid either way', () => {
      const result = evaluateDay(day({ ...CLEAN_DAY, tBreak: { out: 630, in: null } }))
      expect(flag(result, 'unclosed-break')).toMatchObject({
        severity: 'note',
        target: 'tBreak.in',
      })
      expect(result.totals.workTime).toBe(480)
    })

    it('asks for an unclosed lunch and deducts nothing meanwhile', () => {
      const result = evaluateDay(day({ ...CLEAN_DAY, lunch: { out: AT_1300, in: null } }))
      expect(flag(result, 'unclosed-break')).toMatchObject({
        severity: 'needs-input',
        target: 'lunch.in',
      })
      expect(flag(result, 'unclosed-break').reason).toMatch(/nothing has been deducted/)
      expect(result.totals.unpaidBreaks).toBe(0)
    })
  })

  describe('break end, no break start', () => {
    it('treats an orphan lunch end the same way', () => {
      const result = evaluateDay(day({ ...CLEAN_DAY, lunch: { out: null, in: AT_1330 } }))
      expect(flag(result, 'orphan-break-end')).toMatchObject({
        severity: 'needs-input',
        target: 'lunch.out',
      })
      expect(result.totals.unpaidBreaks).toBe(0)
    })
  })

  describe('no lunch recorded on a long shift', () => {
    it('notes it without inventing one', () => {
      const noLunch = day({ start: AT_0900, finish: AT_1730 })
      const result = evaluateDay(noLunch)
      expect(flag(result, 'no-lunch-recorded')).toMatchObject({
        severity: 'note',
        proposal: null,
      })
      // The total is untouched. That is the whole point of the rule.
      expect(result.totals.workTime).toBe(510)
    })

    it('stays quiet on a short shift', () => {
      const short = day({ start: AT_0900, finish: AT_0900 + 120 })
      expect(codes(evaluateDay(short))).not.toContain('no-lunch-recorded')
    })
  })

  describe('shift end before shift start', () => {
    it('reads it as night work and says so', () => {
      const night = day({ start: 22 * 60, finish: 6 * 60 })
      const result = evaluateDay(night)
      expect(flag(result, 'crosses-midnight')).toMatchObject({ severity: 'assumption' })
      expect(result.totals.gross).toBe(480)
    })

    it('flags it as implausible when the wrapped shift is too long', () => {
      const wrong = day({ start: 9 * 60, finish: 8 * 60 })
      expect(codes(evaluateDay(wrong))).toContain('implausible-length')
    })
  })

  describe('overlapping breaks', () => {
    it('merges and flags, with paid time winning the overlap', () => {
      const overlapped = day({
        ...CLEAN_DAY,
        tBreak: { out: AT_1300, in: AT_1300 + 10 },
      })
      const result = evaluateDay(overlapped)
      expect(flag(result, 'overlapping-breaks')).toMatchObject({ severity: 'assumption' })
      expect(result.totals).toMatchObject({ paidBreaks: 10, unpaidBreaks: 20 })
    })
  })

  describe('implausible length', () => {
    it('flags over the maximum and changes nothing', () => {
      const long = day({ start: 5 * 60, finish: 23 * 60 + 30 })
      const result = evaluateDay(long)
      expect(flag(result, 'implausible-length')).toMatchObject({
        severity: 'needs-input',
        proposal: null,
      })
      expect(result.totals.gross).toBe(18 * 60 + 30)
    })

    it('respects a configured maximum', () => {
      const long = day({ start: AT_0900, finish: AT_1730 })
      const strict = settings({ maxShift: 8 * 60 })
      expect(codes(evaluateDay(long, strict))).toContain('implausible-length')
    })
  })
})
