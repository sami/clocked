import { describe, expect, it } from 'vitest'
import { toDay } from '../day/input.ts'
import { DEFAULT_SETTINGS } from '../engine/day.ts'
import { evaluateDay, type FlagCode } from '../engine/rules.ts'
import { summariseDay } from '../engine/summary.ts'
import { FIXTURES, type Fixture } from './days.ts'

/** Every code in the gap handling table. The fixtures must cover all of them. */
const EVERY_CODE: readonly FlagCode[] = [
  'missing-start',
  'missing-finish',
  'unclosed-break',
  'orphan-break-end',
  'crosses-midnight',
  'overlapping-breaks',
  'no-lunch-recorded',
  'implausible-length',
]

function run(fixture: Fixture) {
  const day = toDay(fixture.input)
  return evaluateDay(day, { ...DEFAULT_SETTINGS, ...fixture.settings })
}

describe('fixture days', () => {
  it('has ten of them', () => {
    expect(FIXTURES).toHaveLength(10)
  })

  it('gives each one its own id', () => {
    expect(new Set(FIXTURES.map((each) => each.id)).size).toBe(FIXTURES.length)
  })

  // Every row of the gap handling table has a day that provokes it.
  it.each(EVERY_CODE)('has a day that raises %s', (code) => {
    expect(FIXTURES.some((each) => each.expect.flags.includes(code))).toBe(true)
  })

  it.each(FIXTURES.map((each) => [each.id, each.label, each] as const))(
    '%s %s',
    (_id, _label, fixture) => {
      const { totals, flags } = run(fixture)

      expect(totals.workTime).toBe(fixture.expect.workTime)
      expect(totals.paidBreaks).toBe(fixture.expect.paidBreaks)
      expect(totals.unpaidBreaks).toBe(fixture.expect.unpaidBreaks)
      expect(flags.map((each) => each.code)).toEqual(fixture.expect.flags)
    },
  )

  // Whatever the day, the copied line has to say when it is not final.
  it.each(FIXTURES.map((each) => [each.id, each] as const))(
    '%s says in the copied line whether anything needs checking',
    (_id, fixture) => {
      const day = toDay(fixture.input)
      const evaluation = run(fixture)
      const line = summariseDay(day, evaluation)

      expect(line.includes('[check:')).toBe(fixture.expect.flags.length > 0)
    },
  )

  // No names anywhere. Ids and plain labels only.
  it('carries no personal data', () => {
    const text = JSON.stringify(FIXTURES)
    expect(text).not.toMatch(/\b(?:name|employee|staff)\b/i)
    expect(FIXTURES.every((each) => /^FX-\d{2}$/.test(each.id))).toBe(true)
  })
})
