import { describe, expect, it } from 'vitest'
import {
  addExtraBreak,
  EMPTY_INPUT,
  EXAMPLE_INPUT,
  removeExtraBreak,
  setExtraPaid,
  setPunch,
  toDay,
} from './input.ts'

describe('toDay', () => {
  it('reads an empty form as a day with nothing filled in', () => {
    expect(toDay(EMPTY_INPUT)).toMatchObject({ start: null, finish: null, extra: [] })
  })

  it('parses the example day', () => {
    expect(toDay(EXAMPLE_INPUT)).toMatchObject({
      start: 450,
      tBreak: { out: 615, in: 630 },
      lunch: { out: 780, in: 822 },
      finish: 975,
    })
  })

  // Half-typed text is not an error, it is just not a time yet.
  it('treats unreadable text as not filled in', () => {
    expect(toDay({ ...EMPTY_INPUT, start: '09' }).start).toBe(540)
    expect(toDay({ ...EMPTY_INPUT, start: '0' }).start).toBe(0)
    expect(toDay({ ...EMPTY_INPUT, start: 'nope' }).start).toBeNull()
  })
})

describe('setPunch', () => {
  it.each(['start', 'finish'] as const)('sets %s', (punch) => {
    expect(setPunch(EMPTY_INPUT, punch, '0915')[punch]).toBe('0915')
  })

  it('sets either side of a standard break', () => {
    expect(setPunch(EMPTY_INPUT, 'tBreak.out', '1030').tBreak.out).toBe('1030')
    expect(setPunch(EMPTY_INPUT, 'lunch.in', '1330').lunch.in).toBe('1330')
  })

  it('sets a punch on an extra row by position', () => {
    const withRow = addExtraBreak(EMPTY_INPUT, 'lunch')
    expect(setPunch(withRow, 'extra.0.out', '1500').extra[0]?.out).toBe('1500')
  })

  it('leaves the rest of the day alone', () => {
    const filled = setPunch(setPunch(EMPTY_INPUT, 'start', '0900'), 'finish', '1730')
    expect(filled).toMatchObject({ start: '0900', finish: '1730' })
  })
})

describe('extra break rows', () => {
  it('appends, marks paid and removes', () => {
    const added = addExtraBreak(EMPTY_INPUT, 'other')
    expect(added.extra).toHaveLength(1)
    expect(setExtraPaid(added, 0, true).extra[0]?.paid).toBe(true)
    expect(removeExtraBreak(added, 0).extra).toHaveLength(0)
  })

  // Appending must not disturb the six standard fields.
  it('never touches the standard fields', () => {
    const filled = setPunch(EMPTY_INPUT, 'start', '0900')
    expect(addExtraBreak(filled, 'lunch').start).toBe('0900')
  })
})
