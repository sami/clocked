import { describe, expect, it } from 'vitest'
import { EMPTY_INPUT, type DayInput } from '../day/input.ts'
import { DEFAULT_SETTINGS } from '../engine/day.ts'
import { setNote, type SavedSheet } from '../storage/sheets.ts'
import { outstanding, reviewItems } from './items.ts'

function punches(over: Partial<DayInput> = {}): DayInput {
  return { ...EMPTY_INPUT, ...over }
}

function sheet(over: Partial<SavedSheet> = {}): SavedSheet {
  return {
    id: 'sheet-1',
    name: 'AB',
    date: '2026-09-21',
    input: EMPTY_INPUT,
    settings: DEFAULT_SETTINGS,
    notes: {},
    ...over,
  }
}

/** A day with no finish, which raises exactly one flag. */
const NO_FINISH = punches({ start: '0900', lunch: { out: '1300', in: '1330' } })

describe('reviewItems', () => {
  it('lists nothing when nothing is flagged', () => {
    const clean = punches({
      start: '0900',
      lunch: { out: '1300', in: '1330' },
      finish: '1730',
    })
    expect(reviewItems([sheet({ input: clean })])).toEqual([])
  })

  it('carries the date, the name and the reason from the rule', () => {
    const items = reviewItems([sheet({ input: NO_FINISH })])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      name: 'AB',
      date: '2026-09-21',
      code: 'missing-finish',
      target: 'finish',
    })
    expect(items[0]?.reason).toContain('no finish')
  })

  it('picks up the note left against the flag', () => {
    const noted = setNote(sheet({ input: NO_FINISH }), 'missing-finish@finish', {
      expected: '1730',
      reviewed: true,
      actual: '1742',
    })
    expect(reviewItems([noted])[0]).toMatchObject({
      expected: '1730',
      reviewed: true,
      actual: '1742',
    })
  })

  // A checklist is worked through in date order.
  it('orders by date, then by name', () => {
    const items = reviewItems([
      sheet({ id: '1', name: 'CD', date: '2026-09-22', input: NO_FINISH }),
      sheet({ id: '2', name: 'AB', date: '2026-09-21', input: NO_FINISH }),
      sheet({ id: '3', name: 'AA', date: '2026-09-22', input: NO_FINISH }),
    ])
    expect(items.map((each) => `${each.date} ${each.name}`)).toEqual([
      '2026-09-21 AB',
      '2026-09-22 AA',
      '2026-09-22 CD',
    ])
  })

  // An undated sheet is the one you want to notice, so it goes last.
  it('puts an undated sheet at the end', () => {
    const items = reviewItems([
      sheet({ id: '1', date: '', input: NO_FINISH }),
      sheet({ id: '2', date: '2026-09-21', input: NO_FINISH }),
    ])
    expect(items.map((each) => each.date)).toEqual(['2026-09-21', ''])
  })

  it('lists every flag on a day, not just the first', () => {
    const messy = punches({ start: '0600', finish: '0030' })
    const codes = reviewItems([sheet({ input: messy })]).map((each) => each.code)
    expect(codes.length).toBeGreaterThan(1)
  })
})

describe('outstanding', () => {
  it('counts what is still to be chased', () => {
    const one = sheet({ id: '1', input: NO_FINISH })
    const done = setNote(sheet({ id: '2', input: NO_FINISH }), 'missing-finish@finish', {
      reviewed: true,
    })
    expect(outstanding(reviewItems([one, done]))).toBe(1)
  })
})
