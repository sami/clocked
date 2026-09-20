import { describe, expect, it } from 'vitest'
import {
  calculateDay,
  DEFAULT_SETTINGS,
  EMPTY_DAY,
  type Day,
  type Rounding,
  type Settings,
} from './day.ts'

/** Build a day from the empty one. Times are minutes since midnight. */
function day(over: Partial<Day> = {}): Day {
  return { ...EMPTY_DAY, ...over }
}

function settings(over: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...over }
}

const AT_0900 = 540
const AT_1030 = 630
const AT_1045 = 645
const AT_1300 = 780
const AT_1330 = 810
const AT_1730 = 1050

/** 09:00 to 17:30, a 15 minute t-break and a half hour lunch. */
const CLEAN_DAY = day({
  start: AT_0900,
  tBreak: { out: AT_1030, in: AT_1045 },
  lunch: { out: AT_1300, in: AT_1330 },
  finish: AT_1730,
})

describe('calculateDay', () => {
  it('reports nothing for an empty day rather than zero', () => {
    expect(calculateDay(EMPTY_DAY)).toEqual({
      gross: null,
      paidBreaks: 0,
      unpaidBreaks: 0,
      workTime: null,
    })
  })

  it('totals a clean day', () => {
    expect(calculateDay(CLEAN_DAY)).toEqual({
      gross: 510,
      paidBreaks: 15,
      unpaidBreaks: 30,
      workTime: 480,
    })
  })

  // The one rule the whole app is built around.
  it('never changes work time for a t-break, however long it ran', () => {
    const marathon = day({ ...CLEAN_DAY, tBreak: { out: AT_1030, in: AT_1030 + 180 } })
    expect(calculateDay(marathon).workTime).toBe(calculateDay(CLEAN_DAY).workTime)
    expect(calculateDay(marathon).paidBreaks).toBe(180)
  })

  it('deducts lunch at its actual length, not an expected one', () => {
    const longLunch = day({ ...CLEAN_DAY, lunch: { out: AT_1300, in: AT_1300 + 47 } })
    expect(calculateDay(longLunch).unpaidBreaks).toBe(47)
    expect(calculateDay(longLunch).workTime).toBe(510 - 47)
  })

  // Never assume a length. The gap rules raise a flag for this instead.
  it('contributes nothing for a break with a punch missing', () => {
    const unclosed = day({ ...CLEAN_DAY, lunch: { out: AT_1300, in: null } })
    expect(calculateDay(unclosed).unpaidBreaks).toBe(0)
    expect(calculateDay(unclosed).workTime).toBe(510)
  })

  it('leaves gross and work time null while start or finish is missing', () => {
    const noFinish = day({ ...CLEAN_DAY, finish: null })
    expect(calculateDay(noFinish)).toMatchObject({ gross: null, workTime: null })

    const noStart = day({ ...CLEAN_DAY, start: null })
    expect(calculateDay(noStart)).toMatchObject({ gross: null, workTime: null })

    // The breaks are still real, so they are still counted and shown.
    expect(calculateDay(noFinish).unpaidBreaks).toBe(30)
  })

  describe('shifts crossing midnight', () => {
    it('reads a finish before the start as the next morning', () => {
      const night = day({ start: 22 * 60, finish: 6 * 60 })
      expect(calculateDay(night).gross).toBe(480)
    })

    it('handles a break that crosses midnight too', () => {
      const night = day({
        start: 22 * 60,
        lunch: { out: 23 * 60 + 45, in: 15 },
        finish: 6 * 60,
      })
      expect(calculateDay(night)).toMatchObject({ unpaidBreaks: 30, workTime: 450 })
    })
  })

  describe('extra break rows', () => {
    it('counts a second lunch as unpaid', () => {
      const twoLunches = day({
        ...CLEAN_DAY,
        extra: [{ type: 'lunch', out: 15 * 60, in: 15 * 60 + 20 }],
      })
      expect(calculateDay(twoLunches).unpaidBreaks).toBe(50)
      expect(calculateDay(twoLunches).workTime).toBe(460)
    })

    it('treats other as unpaid by default and paid when marked', () => {
      const unpaid = day({
        ...CLEAN_DAY,
        extra: [{ type: 'other', out: 15 * 60, in: 15 * 60 + 20 }],
      })
      expect(calculateDay(unpaid)).toMatchObject({ unpaidBreaks: 50, paidBreaks: 15 })

      const marked = day({
        ...CLEAN_DAY,
        extra: [{ type: 'other', out: 15 * 60, in: 15 * 60 + 20, paid: true }],
      })
      expect(calculateDay(marked)).toMatchObject({ unpaidBreaks: 30, paidBreaks: 35 })
    })
  })

  describe('settings', () => {
    it('follows the house rules when a type is repaid', () => {
      const paidLunch = settings({ paid: { tbreak: true, lunch: true, other: false } })
      expect(calculateDay(CLEAN_DAY, paidLunch)).toMatchObject({
        paidBreaks: 45,
        unpaidBreaks: 0,
        workTime: 510,
      })
    })

    // 09:00 to 17:30 with a 23 minute lunch leaves 487 minutes.
    it.each<[Rounding, number]>([
      ['exact', 487],
      [1, 487],
      [5, 485],
      [6, 486],
      [15, 480],
    ])('rounds work time to %s', (rounding, expected) => {
      const awkward = day({ ...CLEAN_DAY, lunch: { out: AT_1300, in: AT_1300 + 23 } })
      expect(calculateDay(awkward, settings({ rounding })).workTime).toBe(expected)
    })

    it('rounds only work time, so the parts stay honest', () => {
      const awkward = day({ ...CLEAN_DAY, lunch: { out: AT_1300, in: AT_1300 + 23 } })
      const rounded = calculateDay(awkward, settings({ rounding: 15 }))
      expect(rounded).toMatchObject({ gross: 510, unpaidBreaks: 23, workTime: 480 })
    })
  })
})
