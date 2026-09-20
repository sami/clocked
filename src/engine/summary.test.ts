import { describe, expect, it } from 'vitest'
import { EMPTY_DAY, type Day } from './day.ts'
import { evaluateDay } from './rules.ts'
import { summariseDay } from './summary.ts'

function line(day: Day): string {
  return summariseDay(day, evaluateDay(day))
}

function day(over: Partial<Day> = {}): Day {
  return { ...EMPTY_DAY, ...over }
}

const CLEAN_DAY = day({
  start: 540,
  tBreak: { out: 630, in: 645 },
  lunch: { out: 780, in: 810 },
  finish: 1050,
})

describe('summariseDay', () => {
  it('reads as a clean total when nothing is flagged', () => {
    expect(line(CLEAN_DAY)).toBe(
      '09:00-17:30, worked 8h, paid breaks 15m, unpaid breaks 30m',
    )
  })

  // The rule that matters: an assumed total must never look recorded.
  it('names what needs checking, so the line cannot be mistaken for clean', () => {
    const night = day({ start: 22 * 60, finish: 6 * 60 })
    expect(line(night)).toBe(
      '22:00-06:00, worked 8h, paid breaks 0m, unpaid breaks 0m [check: crosses midnight, no lunch recorded]',
    )
  })

  it('says there is no total rather than printing a misleading zero', () => {
    expect(line(day({ start: 540 }))).toBe(
      '09:00-??:??, no total, paid breaks 0m, unpaid breaks 0m [check: finish missing]',
    )
  })

  it('lists each thing to check once', () => {
    const twoUnclosed = day({
      ...CLEAN_DAY,
      tBreak: { out: 630, in: null },
      lunch: { out: 780, in: null },
    })
    // Two unclosed breaks, named once. The missing lunch note rides along,
    // because nothing unpaid was recorded on a shift this long.
    expect(line(twoUnclosed)).toBe(
      '09:00-17:30, worked 8h 30m, paid breaks 0m, unpaid breaks 0m [check: break not closed, no lunch recorded]',
    )
  })
})
